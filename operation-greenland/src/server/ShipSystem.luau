-- ShipSystem.luau
-- Server-side ship management: spawning, movement physics, health, destruction, replication.
-- Required by: src/server/init.luau
--
-- Integration:
--   - init(remotes, onRespawnReady): accepts remotes table from GameManager — no
--     separate folder created here. All events are in ReplicatedStorage.Remotes.
--   - ApplyDamage(userId, amount) -> number   : for CombatSystem
--   - GetShipPosition(userId) -> Vector3?     : for CombatSystem hit detection
--   - Fires HealthUpdated / SpeedUpdated per-player each tick for the HUD.
--   - Fires ShipStateUpdate (bulk) for client-side ship rendering.
--
-- Ship model architecture (for client team):
--   Ships are NOT parented to the player Character. On ShipSpawned, the client
--   should clone the model from ReplicatedStorage.ShipModels[ModelId], name it
--   "Ship_" .. ShipId, and parent it to workspace. ShipController/CameraController
--   should reference workspace:WaitForChild("Ship_" .. shipId).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local ShipConfig = require(Shared:WaitForChild("ShipConfig"))
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local Utils = require(Shared:WaitForChild("Utils"))

local ShipSystem = {}

-- ─── Internal state ────────────────────────────────────────────────────────────

-- All live ship states, keyed by shipId
local _ships: { [string]: any } = {}

-- userId → shipId
local _playerShipMap: { [number]: string } = {}

-- userId → seconds remaining until respawn
local _respawnTimers: { [number]: number } = {}

-- Spawn slot occupancy (index → bool)
local _spawnSlots: { [number]: boolean } = {}

-- Shared remotes table (injected via init — comes from GameManager.GetRemotes())
local _remotes: { [string]: RemoteEvent } = {}

-- Callback fired when a respawn timer expires: (userId: number) -> ()
local _onRespawnReady: ((number) -> ())?

-- Drag coefficient applied per second when there is no throttle input
local DRAG_PER_SECOND = 0.85

-- Staggered fleet formation at the southern naval base
local SPAWN_POSITIONS = {
	Vector3.new(-300, 0, -7500),
	Vector3.new(-150, 0, -7600),
	Vector3.new(0, 0, -7500),
	Vector3.new(150, 0, -7600),
	Vector3.new(300, 0, -7500),
	Vector3.new(-225, 0, -7700),
	Vector3.new(-75, 0, -7700),
	Vector3.new(75, 0, -7700),
	Vector3.new(225, 0, -7700),
	Vector3.new(0, 0, -7800),
}

-- ─── Initialization ────────────────────────────────────────────────────────────

--- Accept the shared remotes table from GameManager and wire all listeners.
--- GameManager must call Init() first so all RemoteEvents already exist.
---
---   GameManager.Init()
---   ShipSystem.init(GameManager.GetRemotes(), onRespawnReady)
function ShipSystem.init(remotes: { [string]: RemoteEvent }, onRespawnReady: ((number) -> ())?)
	_remotes = remotes
	_onRespawnReady = onRespawnReady

	-- ShipMoveInput is in the shared Remotes folder (added to REMOTE_NAMES in GameManager).
	-- Wire the listener here — no need to create a new RemoteEvent.
	_remotes["ShipMoveInput"].OnServerEvent:Connect(function(player: Player, inputData: any)
		ShipSystem._handleMoveInput(player, inputData)
	end)

	Players.PlayerRemoving:Connect(function(player: Player)
		ShipSystem._onPlayerLeave(player)
	end)
end

-- ─── Spawning ─────────────────────────────────────────────────────────────────

--- Spawn a ship for . Uses shipType from GameManager.GetPlayerData() if
---  is not explicitly passed (e.g. post-respawn auto-spawn).
--- Returns the new shipId, or nil on failure.
function ShipSystem.spawnShip(player: Player, shipType: string?): string?
	local userId = player.UserId

	if _playerShipMap[userId] then
		warn("[ShipSystem] Player " .. userId .. " already has an active ship")
		return nil
	end

	-- Read the player's lobby selection if no override was supplied
	local resolvedType = shipType
	if not resolvedType then
		local remotesFolder = ReplicatedStorage:FindFirstChild("Remotes")
		-- Require GameManager lazily to read player data without a top-level circular dep
		local ok, GameManager = pcall(require, script.Parent:WaitForChild("GameManager"))
		if ok and GameManager then
			local pd = GameManager.GetPlayerData(player)
			resolvedType = pd and pd.shipType or nil
		end
		resolvedType = resolvedType or "Destroyer"
		_ = remotesFolder -- suppress unused warning
	end

	local config = ShipConfig.GetShipConfig(resolvedType)
	if not config then
		warn("[ShipSystem] Unknown ship type: " .. tostring(resolvedType))
		return nil
	end

	-- Claim a spawn slot
	local slotIndex: number? = nil
	for i = 1, #SPAWN_POSITIONS do
		if not _spawnSlots[i] then
			slotIndex = i
			_spawnSlots[i] = true
			break
		end
	end
	if not slotIndex then
		warn("[ShipSystem] No spawn slots available")
		return nil
	end

	local shipId = Utils.GenerateId("ship")
	local spawnPos = SPAWN_POSITIONS[slotIndex]

	-- Velocity is stored as {X, Z} (no Y component — ships are surface-only).
	-- Use ship.Velocity.X / ship.Velocity.Z directly; do not call .Magnitude on it.
	local shipData = {
		ShipId = shipId,
		OwnerId = userId,
		ShipType = resolvedType,
		Position = spawnPos, -- Vector3; Y is always 0 (sea level)
		Orientation = 0, -- degrees, Y-axis rotation (0 = north)
		Velocity = { X = 0, Z = 0 }, -- {X,Z} table, NOT Vector3 (no Y needed)
		Health = config.Health,
		MaxHealth = config.Health,
		IsAlive = true,
		InShallowWater = false,
		InStorm = false,
		_slotIndex = slotIndex,
		_inputForward = 0,
		_inputTurn = 0,
	}

	_ships[shipId] = shipData
	_playerShipMap[userId] = shipId

	-- Notify all clients so they can instantiate the ship model in workspace.
	-- Client: clone ReplicatedStorage.ShipModels[ModelId], name "Ship_"..ShipId, parent to workspace.
	_remotes["ShipSpawned"]:FireAllClients({
		ShipId = shipId,
		OwnerId = userId,
		DisplayName = player.DisplayName,
		ShipType = resolvedType,
		ModelId = config.ModelId,
		Position = spawnPos,
		Orientation = 0,
		MaxHealth = config.Health,
	})

	ShipSystem._fireHealthUpdated(player, config.Health, config.Health)

	return shipId
end

--- Remove the ship state immediately (no animation). Called after the sink sequence completes.
function ShipSystem.despawnShip(shipId: string)
	local ship = _ships[shipId]
	if not ship then
		return
	end

	if ship._slotIndex then
		_spawnSlots[ship._slotIndex] = false
	end

	_playerShipMap[ship.OwnerId] = nil
	_ships[shipId] = nil

	-- ShipDespawned tells clients to remove the workspace model entirely.
	_remotes["ShipDespawned"]:FireAllClients({ ShipId = shipId })
end

-- ─── Health & Damage ──────────────────────────────────────────────────────────

--- Apply damage by userId — primary API for CombatSystem.
--- Returns remaining HP, or 0 if the player has no active ship.
function ShipSystem.ApplyDamage(userId: number, amount: number): number
	local shipId = _playerShipMap[userId]
	if not shipId then
		return 0
	end
	return ShipSystem._takeDamage(shipId, amount)
end

--- Apply damage by shipId — used by HazardSystem (icebergs, storm).
function ShipSystem.takeDamage(shipId: string, damage: number): number
	return ShipSystem._takeDamage(shipId, damage)
end

function ShipSystem._takeDamage(shipId: string, damage: number): number
	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then
		return 0
	end

	ship.Health = math.max(0, ship.Health - damage)

	local player = Players:GetPlayerByUserId(ship.OwnerId)
	if player then
		ShipSystem._fireHealthUpdated(player, ship.Health, ship.MaxHealth)
	end

	if ship.Health <= 0 then
		ShipSystem._destroyShip(shipId)
	end

	return ship.Health
end

--- Apply healing by shipId — used by Supply Ship aura.
function ShipSystem.applyHeal(shipId: string, amount: number): number
	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then
		return 0
	end

	ship.Health = math.min(ship.MaxHealth, ship.Health + amount)

	local player = Players:GetPlayerByUserId(ship.OwnerId)
	if player then
		ShipSystem._fireHealthUpdated(player, ship.Health, ship.MaxHealth)
	end

	return ship.Health
end

--- Begin the ship destruction sequence:
---   1. Disable input and zero velocity.
---   2. Fire ShipDestroyed (all clients play sink animation).
---   3. Wait 3 seconds, then despawn (fire ShipDespawned, remove workspace model).
---   4. Start respawn countdown.
function ShipSystem._destroyShip(shipId: string)
	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then
		return
	end

	ship.IsAlive = false
	ship._inputForward = 0
	ship._inputTurn = 0
	ship.Velocity = { X = 0, Z = 0 }

	-- ShipDestroyed → clients play sink animation immediately
	_remotes["ShipDestroyed"]:FireAllClients({ ShipId = shipId, OwnerId = ship.OwnerId })

	-- ShipDespawned fires after animation, removing the workspace model
	task.delay(3, function()
		ShipSystem.despawnShip(shipId)
	end)

	_respawnTimers[ship.OwnerId] = GameConfig.RESPAWN_DELAY
end

-- ─── Movement Input ───────────────────────────────────────────────────────────

function ShipSystem._handleMoveInput(player: Player, inputData: any)
	if type(inputData) ~= "table" then
		return
	end

	-- Server validates all input — clients cannot send out-of-range values
	local fwd = math.clamp(tonumber(inputData.forward) or 0, -1, 1)
	local turn = math.clamp(tonumber(inputData.turn) or 0, -1, 1)

	local shipId = _playerShipMap[player.UserId]
	if not shipId then
		return
	end

	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then
		return
	end

	ship._inputForward = fwd
	ship._inputTurn = turn
end

-- ─── Physics Tick ─────────────────────────────────────────────────────────────

--- Advance all ship physics by  seconds.
--- Call from the main server loop at GameConfig.PHYSICS_TICK rate.
function ShipSystem.tick(dt: number)
	local healPulses = {}

	for shipId, ship in pairs(_ships) do
		if not ship.IsAlive then
			continue
		end

		local config = ShipConfig.GetShipConfig(ship.ShipType)
		if not config then
			continue
		end

		local speedMult = ship.InShallowWater and config.ShallowWaterSpeedMultiplier or 1.0
		local maxSpeed = config.Speed * speedMult

		-- ── Turning ──────────────────────────────────────────────────────
		ship.Orientation = (ship.Orientation + config.TurnRate * ship._inputTurn * dt) % 360

		-- ── Acceleration / drag ──────────────────────────────────────────
		local rad = math.rad(ship.Orientation)
		local fwdX = math.sin(rad)
		local fwdZ = math.cos(rad)

		if ship._inputForward ~= 0 then
			local accel = config.Acceleration * ship._inputForward * dt
			ship.Velocity.X += fwdX * accel
			ship.Velocity.Z += fwdZ * accel
		else
			-- Exponential drag: feels like water resistance, not instant stop
			local drag = DRAG_PER_SECOND ^ dt
			ship.Velocity.X *= drag
			ship.Velocity.Z *= drag
		end

		-- ── Speed cap ────────────────────────────────────────────────────
		local speed = math.sqrt(ship.Velocity.X ^ 2 + ship.Velocity.Z ^ 2)
		if speed > maxSpeed then
			local scale = maxSpeed / speed
			ship.Velocity.X *= scale
			ship.Velocity.Z *= scale
			speed = maxSpeed
		end

		-- ── Storm push (uncapped — waves can exceed normal max speed) ────
		if ship.InStorm then
			ship.Velocity.X += (math.random() * 2 - 1) * GameConfig.STORM_PUSH_FORCE * dt
			ship.Velocity.Z += (math.random() * 2 - 1) * GameConfig.STORM_PUSH_FORCE * dt
		end

		-- ── Position update with map boundary enforcement ────────────────
		local newX = ship.Position.X + ship.Velocity.X * dt
		local newZ = ship.Position.Z + ship.Velocity.Z * dt
		local bounds = GameConfig.MAP_BOUNDS

		if newX < bounds.MinX or newX > bounds.MaxX then
			newX = math.clamp(newX, bounds.MinX, bounds.MaxX)
			ship.Velocity.X = 0
		end
		if newZ < bounds.MinZ or newZ > bounds.MaxZ then
			newZ = math.clamp(newZ, bounds.MinZ, bounds.MaxZ)
			ship.Velocity.Z = 0
		end

		ship.Position = Vector3.new(newX, ship.Position.Y, newZ)
		ship.InShallowWater = ship.Position.Z >= GameConfig.SHALLOW_WATER_Z_THRESHOLD

		-- ── HUD: speed as throttle percentage ────────────────────────────
		local player = Players:GetPlayerByUserId(ship.OwnerId)
		if player then
			local throttlePct = math.floor((speed / config.Speed) * 100)
			_remotes["SpeedUpdated"]:FireClient(player, throttlePct)
		end

		-- ── Supply Ship heal aura (passive) ──────────────────────────────
		if ship.ShipType == ShipConfig.ShipType.SUPPLY_SHIP then
			local aura = config.SpecialWeapon
			local healed = {}
			for otherShipId, other in pairs(_ships) do
				if otherShipId == shipId or not other.IsAlive then
					continue
				end
				if Utils.Distance2D(ship.Position, other.Position) <= aura.AuraRadius then
					ShipSystem.applyHeal(otherShipId, aura.HealPerSecond * dt)
					table.insert(healed, otherShipId)
				end
			end
			if #healed > 0 then
				table.insert(healPulses, { SourceId = shipId, HealedIds = healed })
			end
		end
	end

	-- ── Respawn timers ────────────────────────────────────────────────────
	for userId, timeLeft in pairs(_respawnTimers) do
		local newTime = timeLeft - dt
		if newTime <= 0 then
			_respawnTimers[userId] = nil
			if _onRespawnReady then
				_onRespawnReady(userId)
			end
		else
			_respawnTimers[userId] = newTime
		end
	end

	-- ── Heal aura VFX broadcast ───────────────────────────────────────────
	for _, pulse in ipairs(healPulses) do
		_remotes["HealAuraActive"]:FireAllClients(pulse)
	end
end

-- ─── Replication ──────────────────────────────────────────────────────────────

--- Push a full ship state snapshot to all clients for rendering and minimap.
--- Call every N physics ticks from the main loop (every 3 ticks ≈ 15 updates/sec).
function ShipSystem.broadcastState()
	local snapshot = {}
	for _, ship in pairs(_ships) do
		table.insert(snapshot, {
			ShipId = ship.ShipId,
			OwnerId = ship.OwnerId,
			Position = ship.Position,
			Orientation = ship.Orientation,
			-- Velocity exposed as {X,Z} table — clients should use X/Z components, not .Magnitude
			VelocityX = ship.Velocity.X,
			VelocityZ = ship.Velocity.Z,
			Health = ship.Health,
			MaxHealth = ship.MaxHealth,
			IsAlive = ship.IsAlive,
		})
	end
	_remotes["ShipStateUpdate"]:FireAllClients(snapshot)
end

-- ─── Queries ──────────────────────────────────────────────────────────────────

--- Return the world position of the ship owned by , or nil.
--- Primary hit-detection query for CombatSystem.
function ShipSystem.GetShipPosition(userId: number): Vector3?
	local shipId = _playerShipMap[userId]
	if not shipId then
		return nil
	end
	local ship = _ships[shipId]
	return ship and ship.Position or nil
end

--- Return the full ship state for , or nil.
function ShipSystem.getShip(shipId: string): any
	return _ships[shipId]
end

--- Return the shipId of the ship owned by , or nil.
function ShipSystem.getShipForPlayer(userId: number): string?
	return _playerShipMap[userId]
end

--- Return all active ships (read-only — do not mutate from outside ShipSystem).
function ShipSystem.getAllShips(): { [string]: any }
	return _ships
end

-- ─── External setters (called by HazardSystem) ────────────────────────────────

--- Set whether a ship is inside a storm. Called by HazardSystem each tick.
function ShipSystem.setInStorm(shipId: string, inStorm: boolean)
	local ship = _ships[shipId]
	if ship then
		ship.InStorm = inStorm
	end
end

--- Set whether a ship is in shallow water. Called by HazardSystem for harbour zones.
function ShipSystem.setInShallowWater(shipId: string, inShallow: boolean)
	local ship = _ships[shipId]
	if ship then
		ship.InShallowWater = inShallow
	end
end

-- ─── Private helpers ──────────────────────────────────────────────────────────

function ShipSystem._fireHealthUpdated(player: Player, current: number, max: number)
	if _remotes["HealthUpdated"] and player and player.Parent then
		_remotes["HealthUpdated"]:FireClient(player, current, max)
	end
end

function ShipSystem._onPlayerLeave(player: Player)
	local shipId = _playerShipMap[player.UserId]
	if shipId then
		local ship = _ships[shipId]
		if ship and ship._slotIndex then
			_spawnSlots[ship._slotIndex] = false
		end
		_playerShipMap[player.UserId] = nil
		_ships[shipId] = nil
		-- Notify clients to remove the model without playing sink animation
		_remotes["ShipDespawned"]:FireAllClients({ ShipId = shipId })
	end
	_respawnTimers[player.UserId] = nil
end

return ShipSystem
