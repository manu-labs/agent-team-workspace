-- ShipSystem.luau
-- Server-side ship management: spawning, movement physics, health, destruction, replication.
-- Required by: src/server/init.luau
--
-- Architecture:
--   - All ship state lives on the server (_ships table). Clients never own positions.
--   - Clients send input via RemoteEvent; server validates and applies physics each tick.
--   - Positions and health are broadcast to all clients on a fixed tick for rendering.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local ShipConfig = require(Shared:WaitForChild("ShipConfig"))
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local Utils = require(Shared:WaitForChild("Utils"))

local ShipSystem = {}

-- ─── Internal state ────────────────────────────────────────────────────────────

-- All live ship states, keyed by shipId
local _ships: {[string]: any} = {}

-- userId → shipId mapping
local _playerShipMap: {[number]: string} = {}

-- userId → seconds remaining until respawn
local _respawnTimers: {[number]: number} = {}

-- Spawn slot occupancy (index → bool)
local _spawnSlots: {[number]: boolean} = {}

-- RemoteEvent handles, populated in init()
local _remotes: {[string]: RemoteEvent} = {}

-- Callback invoked when a respawn timer expires: (userId: number) -> ()
-- Set by GameManager so it can re-prompt the player for ship selection.
local _onRespawnReady: ((number) -> ())?

-- Drag coefficient applied per second when no throttle input
local DRAG_PER_SECOND = 0.85

-- Staggered fleet formation spawn positions at the southern naval base
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

--- Set up RemoteEvents and wire player/input listeners.
--- Must be called once from init.luau before the game loop starts.
function ShipSystem.init(onRespawnReady: ((number) -> ())?)
	_onRespawnReady = onRespawnReady

	-- Create a folder for all ship-related RemoteEvents
	local eventsFolder = Instance.new("Folder")
	eventsFolder.Name = "ShipEvents"
	eventsFolder.Parent = ReplicatedStorage

	local function makeRemote(name: string): RemoteEvent
		local e = Instance.new("RemoteEvent")
		e.Name = name
		e.Parent = eventsFolder
		_remotes[name] = e
		return e
	end

	-- Server → All clients
	makeRemote("ShipSpawned")      -- new ship entered the world
	makeRemote("ShipDespawned")    -- ship removed from the world
	makeRemote("ShipStateUpdate")  -- bulk position/health snapshot
	makeRemote("ShipDestroyed")    -- ship sunk (triggers client sink animation)
	makeRemote("HealAuraActive")   -- supply ship heal pulse (for client VFX)

	-- Client → Server
	local moveInput = makeRemote("ShipMoveInput")
	moveInput.OnServerEvent:Connect(function(player: Player, inputData: any)
		ShipSystem._handleMoveInput(player, inputData)
	end)

	-- Clean up when a player disconnects
	Players.PlayerRemoving:Connect(function(player: Player)
		ShipSystem._onPlayerLeave(player)
	end)
end

-- ─── Spawning ─────────────────────────────────────────────────────────────────

--- Spawn a ship for  of type .
--- Returns the new shipId on success, or nil if the player already has a ship
--- or if no spawn slot is available.
function ShipSystem.spawnShip(player: Player, shipType: string): string?
	local userId = player.UserId

	if _playerShipMap[userId] then
		warn("[ShipSystem] Player " .. userId .. " already has an active ship — ignoring spawn request")
		return nil
	end

	local config = ShipConfig.GetShipConfig(shipType)
	if not config then
		warn("[ShipSystem] Unknown ship type: " .. tostring(shipType))
		return nil
	end

	-- Claim the next free spawn slot
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

	-- Build ship state (stored server-side only; clients get a slimmer snapshot)
	local shipData = {
		ShipId = shipId,
		OwnerId = userId,
		ShipType = shipType,
		Position = spawnPos,
		Orientation = 0,         -- degrees, facing north (positive Z)
		Velocity = { X = 0, Z = 0 },
		Health = config.Health,
		MaxHealth = config.Health,
		IsAlive = true,
		InShallowWater = false,
		InStorm = false,
		_slotIndex = slotIndex,  -- internal: released on despawn
		_inputForward = 0,       -- last validated client input
		_inputTurn = 0,
	}

	_ships[shipId] = shipData
	_playerShipMap[userId] = shipId

	-- Notify all clients so they can render the ship
	_remotes["ShipSpawned"]:FireAllClients({
		ShipId = shipId,
		OwnerId = userId,
		DisplayName = player.DisplayName,
		ShipType = shipType,
		ModelId = config.ModelId,
		Position = spawnPos,
		Orientation = 0,
		MaxHealth = config.Health,
	})

	return shipId
end

--- Remove a ship from the world immediately (no animation).
--- Use _destroyShip() to trigger the sinking sequence instead.
function ShipSystem.despawnShip(shipId: string)
	local ship = _ships[shipId]
	if not ship then return end

	if ship._slotIndex then
		_spawnSlots[ship._slotIndex] = false
	end

	_playerShipMap[ship.OwnerId] = nil
	_ships[shipId] = nil

	_remotes["ShipDespawned"]:FireAllClients({ ShipId = shipId })
end

-- ─── Health & Damage ──────────────────────────────────────────────────────────

--- Apply  HP to ship . Triggers destruction if HP reaches 0.
--- Returns the ship's remaining HP, or 0 if the ship was not found / already dead.
function ShipSystem.takeDamage(shipId: string, damage: number): number
	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then return 0 end

	ship.Health = math.max(0, ship.Health - damage)

	if ship.Health <= 0 then
		ShipSystem._destroyShip(shipId)
	end

	return ship.Health
end

--- Apply  HP of healing to ship  (capped at MaxHealth).
--- Returns the ship's new HP, or 0 if the ship was not found / already dead.
function ShipSystem.applyHeal(shipId: string, amount: number): number
	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then return 0 end

	ship.Health = math.min(ship.MaxHealth, ship.Health + amount)
	return ship.Health
end

--- Internal: begin the ship destruction sequence.
---  1. Disable controls (IsAlive = false, zero velocity)
---  2. Broadcast ShipDestroyed so clients play the sink animation
---  3. Wait 3 seconds for animation, then call despawnShip
---  4. Start respawn countdown
function ShipSystem._destroyShip(shipId: string)
	local ship = _ships[shipId]
	if not ship or not ship.IsAlive then return end

	ship.IsAlive = false
	ship._inputForward = 0
	ship._inputTurn = 0
	ship.Velocity = { X = 0, Z = 0 }

	-- Clients play the sink animation
	_remotes["ShipDestroyed"]:FireAllClients({
		ShipId = shipId,
		OwnerId = ship.OwnerId,
	})

	-- Remove after animation completes
	task.delay(3, function()
		ShipSystem.despawnShip(shipId)
	end)

	-- Start respawn timer
	_respawnTimers[ship.OwnerId] = GameConfig.RESPAWN_DELAY
end

-- ─── Movement Input ───────────────────────────────────────────────────────────

--- Handle a ShipMoveInput event from a client.
--- inputData is expected to be { forward: number, turn: number } in [-1, 1].
--- Server validates and sanitises all values — clients cannot trust their own input.
function ShipSystem._handleMoveInput(player: Player, inputData: any)
	if type(inputData) ~= "table" then return end

	-- Sanitise: clamp to valid range, reject NaN via tonumber fallback to 0
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

--- Advance physics by  seconds for all live ships.
---  (optional) is used for storm push forces — provided by HazardSystem.
--- Call this from the main server loop at GameConfig.PHYSICS_TICK rate.
function ShipSystem.tick(dt: number)
	local healPulses = {}

	for shipId, ship in pairs(_ships) do
		if not ship.IsAlive then continue end

		local config = ShipConfig.GetShipConfig(ship.ShipType)
		if not config then continue end

		-- Effective max speed (reduced in shallow water)
		local speedMult = ship.InShallowWater and config.ShallowWaterSpeedMultiplier or 1.0
		local maxSpeed  = config.Speed * speedMult

		-- ── Turning ──────────────────────────────────────────────────────
		local turnDelta   = config.TurnRate * ship._inputTurn * dt
		ship.Orientation  = (ship.Orientation + turnDelta) % 360

		-- ── Acceleration / drag ──────────────────────────────────────────
		local angleRad = math.rad(ship.Orientation)
		local fwdX     = math.sin(angleRad)
		local fwdZ     = math.cos(angleRad)

		if ship._inputForward ~= 0 then
			local accel = config.Acceleration * ship._inputForward * dt
			ship.Velocity.X = ship.Velocity.X + fwdX * accel
			ship.Velocity.Z = ship.Velocity.Z + fwdZ * accel
		else
			-- Exponential drag when coasting (feels like water resistance)
			local dragFactor = DRAG_PER_SECOND ^ dt
			ship.Velocity.X  = ship.Velocity.X * dragFactor
			ship.Velocity.Z  = ship.Velocity.Z * dragFactor
		end

		-- Clamp to max speed
		local speed = math.sqrt(ship.Velocity.X ^ 2 + ship.Velocity.Z ^ 2)
		if speed > maxSpeed then
			local scale      = maxSpeed / speed
			ship.Velocity.X  = ship.Velocity.X * scale
			ship.Velocity.Z  = ship.Velocity.Z * scale
		end

		-- ── Storm effects ────────────────────────────────────────────────
		if ship.InStorm then
			-- Random wave push; independent of ship's own velocity cap
			ship.Velocity.X = ship.Velocity.X + (math.random() * 2 - 1) * GameConfig.STORM_PUSH_FORCE * dt
			ship.Velocity.Z = ship.Velocity.Z + (math.random() * 2 - 1) * GameConfig.STORM_PUSH_FORCE * dt
		end

		-- ── Position update ──────────────────────────────────────────────
		local newX = ship.Position.X + ship.Velocity.X * dt
		local newZ = ship.Position.Z + ship.Velocity.Z * dt

		-- Map boundary enforcement (stop at edge, kill velocity on clamped axis)
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

		-- ── Shallow water detection ──────────────────────────────────────
		ship.InShallowWater = ship.Position.Z >= GameConfig.SHALLOW_WATER_Z_THRESHOLD

		-- ── Supply Ship heal aura (passive) ──────────────────────────────
		if ship.ShipType == ShipConfig.ShipType.SUPPLY_SHIP then
			local aura = config.SpecialWeapon
			local healed = {}

			for otherShipId, other in pairs(_ships) do
				if otherShipId == shipId then continue end
				if not other.IsAlive then continue end
				if other.OwnerId == ship.OwnerId then continue end  -- don't heal self

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

	-- ── Broadcast heal aura VFX events ───────────────────────────────────
	for _, pulse in ipairs(healPulses) do
		_remotes["HealAuraActive"]:FireAllClients(pulse)
	end
end

-- ─── Replication ──────────────────────────────────────────────────────────────

--- Push a bulk position/health snapshot to all clients.
--- Call this every N physics ticks from the main server loop to keep clients in sync.
function ShipSystem.broadcastState()
	local snapshot = {}
	for shipId, ship in pairs(_ships) do
		table.insert(snapshot, {
			ShipId      = shipId,
			Position    = ship.Position,
			Orientation = ship.Orientation,
			Velocity    = ship.Velocity,
			Health      = ship.Health,
			IsAlive     = ship.IsAlive,
		})
	end
	_remotes["ShipStateUpdate"]:FireAllClients(snapshot)
end

-- ─── Queries ──────────────────────────────────────────────────────────────────

--- Return the full ship state for , or nil if not found.
function ShipSystem.getShip(shipId: string): any
	return _ships[shipId]
end

--- Return the active shipId for the given userId, or nil.
function ShipSystem.getShipForPlayer(userId: number): string?
	return _playerShipMap[userId]
end

--- Return all active ships (read-only — do not mutate externally).
function ShipSystem.getAllShips(): {[string]: any}
	return _ships
end

-- ─── External setters (called by HazardSystem) ────────────────────────────────

--- Mark or unmark a ship as being inside a storm.
--- Used by HazardSystem after each storm zone overlap check.
function ShipSystem.setInStorm(shipId: string, inStorm: boolean)
	local ship = _ships[shipId]
	if ship then
		ship.InStorm = inStorm
	end
end

--- Mark or unmark a ship as being in shallow water.
--- Normally updated automatically during tick(), but HazardSystem may call this
--- if a more precise shallow-water region map is used.
function ShipSystem.setInShallowWater(shipId: string, inShallow: boolean)
	local ship = _ships[shipId]
	if ship then
		ship.InShallowWater = inShallow
	end
end

-- ─── Player lifecycle ─────────────────────────────────────────────────────────

function ShipSystem._onPlayerLeave(player: Player)
	local shipId = _playerShipMap[player.UserId]
	if shipId then
		ShipSystem.despawnShip(shipId)
	end
	_respawnTimers[player.UserId] = nil
end

return ShipSystem