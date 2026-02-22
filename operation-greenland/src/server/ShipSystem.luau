-- ShipSystem.luau
-- Server-side ship management: spawning, movement physics, health, destruction, replication.
-- Required by: src/server/init.luau
--
-- Integration:
--   - Uses GameManager.GetRemotes() for all output RemoteEvents (shared Remotes folder).
--   - Creates one input RemoteEvent (ShipMoveInput) locally for movement.
--   - Exposes ApplyDamage(userId, amount) and GetShipPosition(userId) for CombatSystem.
--   - Fires HealthUpdated and SpeedUpdated per-player via shared remotes (for HUD).
--   - Fires MinimapUpdated with all ship positions for the minimap.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local ShipConfig = require(Shared:WaitForChild("ShipConfig"))
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local Utils = require(Shared:WaitForChild("Utils"))

local GameManager = require(script.Parent.GameManager)

local ShipSystem = {}

-- ─── Internal state ────────────────────────────────────────────────────────────

-- All live ship states, keyed by shipId
local _ships: {[string]: any} = {}

-- userId → shipId
local _playerShipMap: {[number]: string} = {}

-- userId → seconds remaining until respawn
local _respawnTimers: {[number]: number} = {}

-- Spawn slot occupancy (index → bool)
local _spawnSlots: {[number]: boolean} = {}

-- Shared remotes from GameManager (populated in init)
local _remotes: {[string]: RemoteEvent} = {}

-- Input remote (created locally — not a GameManager output event)
local _moveInputRemote: RemoteEvent

-- Callback fired when a respawn timer expires: (userId: number) -> ()
-- Injected at init() so GameManager can re-prompt ship selection.
local _onRespawnReady: ((number) -> ())?

local DRAG_PER_SECOND = 0.85

-- Staggered fleet formation at the southern naval base
local SPAWN_POSITIONS = {
	Vector3.new(-300, 0, -7500),
	Vector3.new(-150, 0, -7600),
	Vector3.new(   0, 0, -7500),
	Vector3.new( 150, 0, -7600),
	Vector3.new( 300, 0, -7500),
	Vector3.new(-225, 0, -7700),
	Vector3.new( -75, 0, -7700),
	Vector3.new(  75, 0, -7700),
	Vector3.new( 225, 0, -7700),
	Vector3.new(   0, 0, -7800),
}

-- ─── Initialization ────────────────────────────────────────────────────────────

--- Wire up remotes, player events, and the movement input listener.
--- Must be called after GameManager.Init() so remotes already exist.
function ShipSystem.init(onRespawnReady: ((number) -> ())?)
	_onRespawnReady = onRespawnReady
	_remotes = GameManager.GetRemotes()

	-- One input-only remote created locally (not in the shared output list)
	local inputFolder = ReplicatedStorage:WaitForChild("Remotes")
	_moveInputRemote = Instance.new("RemoteEvent")
	_moveInputRemote.Name = "ShipMoveInput"
	_moveInputRemote.Parent = inputFolder

	_moveInputRemote.OnServerEvent:Connect(function(player: Player, inputData: any)
		ShipSystem._handleMoveInput(player, inputData)
	end)

	Players.PlayerRemoving:Connect(function(player: Player)
		ShipSystem._onPlayerLeave(player)
	end)
end

-- ─── Spawning ─────────────────────────────────────────────────────────────────

--- Spawn a ship for . Uses shipType from GameManager.GetPlayerData() if
---  is not explicitly passed.
--- Returns the new shipId, or nil on failure.
function ShipSystem.spawnShip(player: Player, shipType: string?): string?
	local userId = player.UserId

	if _playerShipMap[userId] then
		warn("[ShipSystem] Player " .. userId .. " already has an active ship")
		return nil
	end

	-- Fall back to GameManager's recorded ship selection if not passed explicitly
	local resolvedType = shipType
	if not resolvedType then
		local playerData = GameManager.GetPlayerData(player)
		resolvedType = playerData and playerData.shipType or "Destroyer"
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

	local shipData = {
		ShipId         = shipId,
		OwnerId        = userId,
		ShipType       = resolvedType,
		Position       = spawnPos,
		Orientation    = 0,
		Velocity       = { X = 0, Z = 0 },
		Health         = config.Health,
		MaxHealth      = config.Health,
		IsAlive        = true,
		InShallowWater = false,
		InStorm        = false,
		_slotIndex     = slotIndex,
		_inputForward  = 0,
		_inputTurn     = 0,
	}

	_ships[shipId] = shipData
	_playerShipMap[userId] = shipId

	-- Notify all clients (shared remote)
	_remotes["ShipSpawned"]:FireAllClients({
		ShipId      = shipId,
		OwnerId     = userId,
		DisplayName = player.DisplayName,
		ShipType    = resolvedType,
		ModelId     = config.ModelId,
		Position    = spawnPos,
		Orientation = 0,
		MaxHealth   = config.Health,
	})

	-- Send initial health to the owning player's HUD
	ShipSystem._fireHealthUpdated(player, config.Health, config.Health)

	return shipId
end

--- Remove a ship immediately (no animation). Internal despawn after sink sequence.
function ShipSystem.despawnShip(shipId: string)
	local ship = _ships[shipId]
	if not ship then return end

	if ship._slotIndex then
		_spawnSlots[ship._slotIndex] = false
	end

	_playerShipMap[ship.OwnerId] = nil
	_ships[shipId] = nil

	_remotes["ShipDestroyed"]:FireAllClients({ ShipId = shipId, OwnerId = ship.OwnerId })
end

-- ─── Health & Damage ──────────────────────────────────────────────────────────

--- Apply damage by userId (called by CombatSystem).
--- Returns the ship's remaining HP, or 0 if the player has no ship.
function ShipSystem.ApplyDamage(userId: number, amount: number): number
	local shipId = _playerShipMap[userId]
	if not shipId then return 0 end
	return ShipSystem._takeDamage(shipId, amount)
end

--- Apply damage by shipId (called internally and by HazardSystem).
function ShipSystem.takeDamage(shipId: string, damage: number): number
	return ShipSystem._takeDamage(shipId, damage)
end

function ShipSystem._takeDamage(shipId: string, damage: number): number
	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then return 0 end

	ship.Health = math.max(0, ship.Health - damage)

	-- Fire HealthUpdated to the owning player's HUD
	local player = Players:GetPlayerByUserId(ship.OwnerId)
	if player then
		ShipSystem._fireHealthUpdated(player, ship.Health, ship.MaxHealth)
	end

	if ship.Health <= 0 then
		ShipSystem._destroyShip(shipId)
	end

	return ship.Health
end

--- Apply healing to a ship by shipId (called by HazardSystem / Supply aura).
function ShipSystem.applyHeal(shipId: string, amount: number): number
	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then return 0 end

	ship.Health = math.min(ship.MaxHealth, ship.Health + amount)

	local player = Players:GetPlayerByUserId(ship.OwnerId)
	if player then
		ShipSystem._fireHealthUpdated(player, ship.Health, ship.MaxHealth)
	end

	return ship.Health
end

--- Begin the destruction sequence for a ship.
function ShipSystem._destroyShip(shipId: string)
	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then return end

	ship.IsAlive      = false
	ship._inputForward = 0
	ship._inputTurn   = 0
	ship.Velocity     = { X = 0, Z = 0 }

	-- ShipDestroyed fires in despawnShip; fire it early here for the sink animation
	_remotes["ShipDestroyed"]:FireAllClients({ ShipId = shipId, OwnerId = ship.OwnerId })

	task.delay(3, function()
		-- Despawn clears from _ships and fires ShipDestroyed — guard against double-fire
		-- by only removing from the map; clients already have the event
		if ship._slotIndex then
			_spawnSlots[ship._slotIndex] = false
		end
		_playerShipMap[ship.OwnerId] = nil
		_ships[shipId] = nil
	end)

	_respawnTimers[ship.OwnerId] = GameConfig.RESPAWN_DELAY
end

-- ─── Movement Input ───────────────────────────────────────────────────────────

function ShipSystem._handleMoveInput(player: Player, inputData: any)
	if type(inputData) ~= "table" then return end

	local fwd  = math.clamp(tonumber(inputData.forward) or 0, -1, 1)
	local turn = math.clamp(tonumber(inputData.turn)    or 0, -1, 1)

	local shipId = _playerShipMap[player.UserId]
	if not shipId then return end

	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then return end

	ship._inputForward = fwd
	ship._inputTurn    = turn
end

-- ─── Physics Tick ─────────────────────────────────────────────────────────────

--- Advance physics by  seconds. Call from main server loop at PHYSICS_TICK rate.
function ShipSystem.tick(dt: number)
	local healPulses = {}

	for shipId, ship in pairs(_ships) do
		if not ship.IsAlive then continue end

		local config = ShipConfig.GetShipConfig(ship.ShipType)
		if not config then continue end

		local speedMult = ship.InShallowWater and config.ShallowWaterSpeedMultiplier or 1.0
		local maxSpeed  = config.Speed * speedMult

		-- Turning
		ship.Orientation = (ship.Orientation + config.TurnRate * ship._inputTurn * dt) % 360

		-- Acceleration / drag
		local rad  = math.rad(ship.Orientation)
		local fwdX = math.sin(rad)
		local fwdZ = math.cos(rad)

		if ship._inputForward ~= 0 then
			local accel = config.Acceleration * ship._inputForward * dt
			ship.Velocity.X += fwdX * accel
			ship.Velocity.Z += fwdZ * accel
		else
			local drag = DRAG_PER_SECOND ^ dt
			ship.Velocity.X *= drag
			ship.Velocity.Z *= drag
		end

		-- Speed cap
		local speed = math.sqrt(ship.Velocity.X ^ 2 + ship.Velocity.Z ^ 2)
		if speed > maxSpeed then
			local scale = maxSpeed / speed
			ship.Velocity.X *= scale
			ship.Velocity.Z *= scale
			speed = maxSpeed
		end

		-- Storm push (uncapped — waves can exceed normal speed; discussed in PR)
		if ship.InStorm then
			ship.Velocity.X += (math.random() * 2 - 1) * GameConfig.STORM_PUSH_FORCE * dt
			ship.Velocity.Z += (math.random() * 2 - 1) * GameConfig.STORM_PUSH_FORCE * dt
		end

		-- Position update with boundary enforcement
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

		-- SpeedUpdated to owning player's HUD (throttle as 0–100%)
		local player = Players:GetPlayerByUserId(ship.OwnerId)
		if player then
			local throttlePct = math.floor((speed / config.Speed) * 100)
			_remotes["SpeedUpdated"]:FireClient(player, throttlePct)
		end

		-- Supply Ship heal aura (passive)
		if ship.ShipType == ShipConfig.ShipType.SUPPLY_SHIP then
			local aura   = config.SpecialWeapon
			local healed = {}
			for otherShipId, other in pairs(_ships) do
				if otherShipId == shipId or not other.IsAlive then continue end
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

	-- Respawn timers
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

	-- Heal aura VFX events (unused RemoteEvent for now — HealAuraActive not in shared list)
	-- TODO: add HealAuraActive to GameManager REMOTE_NAMES if VFX team needs it
	_ = healPulses
end

-- ─── Replication ──────────────────────────────────────────────────────────────

--- Broadcast all ship positions to all clients for minimap rendering.
--- Uses the shared MinimapUpdated remote. Call every N ticks from the main loop.
function ShipSystem.broadcastState()
	local ships = {}
	for _, ship in pairs(_ships) do
		table.insert(ships, {
			ShipId      = ship.ShipId,
			OwnerId     = ship.OwnerId,
			Position    = ship.Position,
			Orientation = ship.Orientation,
			Health      = ship.Health,
			IsAlive     = ship.IsAlive,
		})
	end
	_remotes["MinimapUpdated"]:FireAllClients({ Ships = ships })
end

-- ─── Queries & CombatSystem API ───────────────────────────────────────────────

--- Return the world position of the ship owned by , or nil.
--- Used by CombatSystem for hit detection.
function ShipSystem.GetShipPosition(userId: number): Vector3?
	local shipId = _playerShipMap[userId]
	if not shipId then return nil end
	local ship = _ships[shipId]
	return ship and ship.Position or nil
end

--- Return the full ship state for , or nil.
function ShipSystem.getShip(shipId: string): any
	return _ships[shipId]
end

--- Return the active shipId for the given userId, or nil.
function ShipSystem.getShipForPlayer(userId: number): string?
	return _playerShipMap[userId]
end

--- Return all active ships (do not mutate externally).
function ShipSystem.getAllShips(): {[string]: any}
	return _ships
end

-- ─── External setters (called by HazardSystem) ────────────────────────────────

function ShipSystem.setInStorm(shipId: string, inStorm: boolean)
	local ship = _ships[shipId]
	if ship then ship.InStorm = inStorm end
end

function ShipSystem.setInShallowWater(shipId: string, inShallow: boolean)
	local ship = _ships[shipId]
	if ship then ship.InShallowWater = inShallow end
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
		-- Skip animation on disconnect — just clean up state
		local ship = _ships[shipId]
		if ship and ship._slotIndex then
			_spawnSlots[ship._slotIndex] = false
		end
		_playerShipMap[player.UserId] = nil
		_ships[shipId] = nil
	end
	_respawnTimers[player.UserId] = nil
end

return ShipSystem