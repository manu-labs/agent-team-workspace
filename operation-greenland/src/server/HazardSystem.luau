-- HazardSystem.luau
-- Server-side environmental hazard system.
-- Manages icebergs (stationary collision obstacles), moving storms, and shallow
-- water zones. Interfaces with ShipSystem for damage/movement effects and
-- broadcasts hazard data to clients for visual effects.
-- Required by: src/server/init.luau

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local ShipConfig = require(Shared:WaitForChild("ShipConfig"))
local Utils = require(Shared:WaitForChild("Utils"))

local HazardSystem = {}

-- ─── Internal state ────────────────────────────────────────────────────────────

-- Active icebergs, keyed by hazardId
local _icebergs: {[string]: any} = {}

-- Active storms, keyed by hazardId
local _storms: {[string]: any} = {}

-- Shallow water regions (static, defined at init)
local _shallowRegions: {any} = {}

-- RemoteEvents
local _remotes: {[string]: RemoteEvent} = {}

-- Reference to ShipSystem (injected at init to avoid circular require)
local _shipSystem: any = nil

-- Time accumulator for storm spawn interval
local _nextStormSpawn: number = 0

-- Whether the hazard system is active
local _active: boolean = false

-- ─── Iceberg layout ───────────────────────────────────────────────────────────
-- Icebergs are placed in the open ocean between the naval base (Z=-7500) and
-- Greenland's coast (Z=+1000). Sizes: Small / Medium / Large.
-- Layout is designed to create navigable channels — skill-based avoidance, not
-- random punishment.

local ICEBERG_DEFINITIONS = {
	-- Western field (scattered, smaller)
	{ Position = Vector3.new(-2200, 0, -4000), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new(-1900, 0, -3200), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new(-2500, 0, -2800), Size = "Medium", Radius = 80 },
	{ Position = Vector3.new(-1600, 0, -2100), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new(-2800, 0, -1500), Size = "Large",  Radius = 140 },
	-- Central channel (sparse — intentional navigation lane)
	{ Position = Vector3.new(-600,  0, -3800), Size = "Medium", Radius = 80 },
	{ Position = Vector3.new(-300,  0, -2500), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new( 200,  0, -3100), Size = "Medium", Radius = 80 },
	-- Eastern cluster (denser, harder approach)
	{ Position = Vector3.new( 1200, 0, -4200), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new( 1500, 0, -3500), Size = "Large",  Radius = 140 },
	{ Position = Vector3.new( 1800, 0, -2900), Size = "Medium", Radius = 80 },
	{ Position = Vector3.new( 2100, 0, -2200), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new( 2400, 0, -1600), Size = "Medium", Radius = 80 },
	-- Northern approach (thinning out near Greenland coast)
	{ Position = Vector3.new(-1000, 0, -800),  Size = "Small",  Radius = 40 },
	{ Position = Vector3.new(  400, 0, -500),  Size = "Small",  Radius = 40 },
}

-- Collision damage by iceberg size (from GameConfig)
local ICEBERG_DAMAGE_BY_SIZE = {
	Small  = GameConfig.ICEBERG_SMALL_DAMAGE,
	Medium = GameConfig.ICEBERG_MEDIUM_DAMAGE,
	Large  = GameConfig.ICEBERG_LARGE_DAMAGE,
}

-- Collision radius includes a small ship-hull buffer beyond the visual radius
local COLLISION_BUFFER = 20

-- ─── Shallow water regions ─────────────────────────────────────────────────────
-- Defined as circular areas near the Greenland coast.
-- The threshold from GameConfig covers the full Z-axis band, but we also define
-- specific harbour shallows with tighter circles for nuanced slow zones.

local SHALLOW_REGION_DEFINITIONS = {
	{ Position = Vector3.new(-800,  0, 5800),  Radius = 400 },   -- Nuuk approaches
	{ Position = Vector3.new(-1800, 0, 4000),  Radius = 350 },   -- Ilulissat shallows
	{ Position = Vector3.new( 600,  0, 6400),  Radius = 380 },   -- Narsarsuaq shallows
	{ Position = Vector3.new(-400,  0, 2500),  Radius = 320 },   -- Kangerlussuaq inlet
	{ Position = Vector3.new(-2600, 0, 1500),  Radius = 300 },   -- Thule approaches
}

-- ─── Storm movement paths ──────────────────────────────────────────────────────
-- Storms spawn off one side of the map and move across it, then despawn.
-- Entry points and directions are picked from this list.

local STORM_PATHS = {
	{ SpawnX = -5500, SpawnZ =  -2000, DirX =  1, DirZ = 0.2  },  -- west → east
	{ SpawnX =  5500, SpawnZ =  -1000, DirX = -1, DirZ = 0.1  },  -- east → west
	{ SpawnX = -5500, SpawnZ =   1000, DirX =  1, DirZ = -0.1 },  -- west → east (south)
	{ SpawnX =  5500, SpawnZ =   2000, DirX = -1, DirZ = -0.2 },  -- east → west (south)
}

local STORM_RADIUS = 600  -- visual + effect radius in studs

-- ─── Initialization ────────────────────────────────────────────────────────────

--- Set up icebergs, shallow regions, RemoteEvents, and wire up ShipSystem reference.
---  is the ShipSystem module (injected to avoid circular require).
function HazardSystem.init(shipSystem: any)
	_shipSystem = shipSystem

	-- Instantiate icebergs from definitions
	for _, def in ipairs(ICEBERG_DEFINITIONS) do
		local hazardId = Utils.GenerateId("iceberg")
		_icebergs[hazardId] = {
			HazardId        = hazardId,
			HazardType      = "Iceberg",
			Position        = def.Position,
			Radius          = def.Radius + COLLISION_BUFFER,
			Size            = def.Size,
			CollisionDamage = ICEBERG_DAMAGE_BY_SIZE[def.Size],
		}
	end

	-- Instantiate shallow regions
	for _, def in ipairs(SHALLOW_REGION_DEFINITIONS) do
		table.insert(_shallowRegions, {
			Position = def.Position,
			Radius   = def.Radius,
		})
	end

	-- Create RemoteEvents
	local eventsFolder = Instance.new("Folder")
	eventsFolder.Name = "HazardEvents"
	eventsFolder.Parent = ReplicatedStorage

	local function makeRemote(name: string): RemoteEvent
		local e = Instance.new("RemoteEvent")
		e.Name = name
		e.Parent = eventsFolder
		_remotes[name] = e
		return e
	end

	makeRemote("HazardStateUpdate")   -- Server → All: full hazard snapshot (client VFX)
	makeRemote("StormEntered")        -- Server → Player: this player's ship entered a storm
	makeRemote("StormExited")         -- Server → Player: this player's ship left a storm

	-- Broadcast initial iceberg layout to clients (static — sent once at round start)
	_nextStormSpawn = GameConfig.STORM_SPAWN_INTERVAL
end

--- Mark the hazard system as active or paused.
function HazardSystem.setActive(active: boolean)
	_active = active
	if active then
		-- Send the static iceberg layout immediately
		HazardSystem._broadcastIcebergs()
	end
end

-- ─── Tick ─────────────────────────────────────────────────────────────────────

--- Advance all hazards by  seconds.
---  is a table from ShipSystem.getAllShips() — keyed by shipId.
---  is a table from Players:GetPlayers() for per-player RemoteEvent firing.
function HazardSystem.tick(dt: number, allShips: {[string]: any}, players: {Player})
	if not _active then return end

	-- ── Storm spawning ────────────────────────────────────────────────────
	_nextStormSpawn -= dt
	if _nextStormSpawn <= 0 then
		HazardSystem._spawnStorm()
		_nextStormSpawn = GameConfig.STORM_SPAWN_INTERVAL
	end

	-- ── Storm movement & lifetime ─────────────────────────────────────────
	local expiredStorms = {}
	for stormId, storm in pairs(_storms) do
		-- Move storm
		storm.Position = Vector3.new(
			storm.Position.X + storm.VelX * dt,
			storm.Position.Y,
			storm.Position.Z + storm.VelZ * dt
		)
		storm.TimeRemaining -= dt

		-- Despawn if lifetime expired or storm drifted off-map
		local bounds = GameConfig.MAP_BOUNDS
		local outOfBounds = storm.Position.X < bounds.MinX - 1000
			or storm.Position.X > bounds.MaxX + 1000
			or storm.Position.Z < bounds.MinZ - 1000
			or storm.Position.Z > bounds.MaxZ + 1000

		if storm.TimeRemaining <= 0 or outOfBounds then
			table.insert(expiredStorms, stormId)
		end
	end
	for _, stormId in ipairs(expiredStorms) do
		_storms[stormId] = nil
	end

	-- ── Per-ship hazard checks ────────────────────────────────────────────
	for shipId, ship in pairs(allShips) do
		if not ship.IsAlive then continue end

		-- Iceberg collision
		for _, iceberg in pairs(_icebergs) do
			if Utils.Distance2D(ship.Position, iceberg.Position) <= iceberg.Radius then
				-- Deal collision damage and push ship away
				_shipSystem.takeDamage(shipId, iceberg.CollisionDamage)
				HazardSystem._pushShipAway(ship, iceberg.Position, iceberg.Radius)
				break  -- one iceberg hit per tick is enough
			end
		end

		-- Storm presence
		local inStorm = false
		for _, storm in pairs(_storms) do
			if Utils.Distance2D(ship.Position, storm.Position) <= STORM_RADIUS then
				inStorm = true
				-- Periodic storm damage
				_shipSystem.takeDamage(shipId, GameConfig.STORM_DAMAGE_PER_SECOND * dt)
				break
			end
		end

		-- Notify ShipSystem of storm state (it applies push force in its own tick)
		if _shipSystem.getShip(shipId) then
			local wasInStorm = _shipSystem.getShip(shipId).InStorm
			_shipSystem.setInStorm(shipId, inStorm)

			-- Fire per-player enter/exit events for fog VFX
			if inStorm ~= wasInStorm then
				local player = HazardSystem._findPlayerByUserId(ship.OwnerId, players)
				if player then
					if inStorm then
						_remotes["StormEntered"]:FireClient(player, { ShipId = shipId })
					else
						_remotes["StormExited"]:FireClient(player, { ShipId = shipId })
					end
				end
			end
		end

		-- Shallow water (specific harbour regions, in addition to GameConfig Z threshold)
		local inShallow = ship.Position.Z >= GameConfig.SHALLOW_WATER_Z_THRESHOLD
		if not inShallow then
			for _, region in ipairs(_shallowRegions) do
				if Utils.Distance2D(ship.Position, region.Position) <= region.Radius then
					inShallow = true
					break
				end
			end
		end
		_shipSystem.setInShallowWater(shipId, inShallow)
	end
end

-- ─── Replication ──────────────────────────────────────────────────────────────

--- Broadcast current storm positions (and static iceberg data) to all clients.
--- Call every ~5 ticks from the main loop so clients can render storm boundaries.
function HazardSystem.broadcastState()
	local stormSnapshot = {}
	for stormId, storm in pairs(_storms) do
		table.insert(stormSnapshot, {
			HazardId  = stormId,
			Position  = storm.Position,
			Radius    = STORM_RADIUS,
			TimeLeft  = storm.TimeRemaining,
		})
	end
	_remotes["HazardStateUpdate"]:FireAllClients({
		Storms = stormSnapshot,
	})
end

--- Send the static iceberg layout to all clients (called once on round start).
function HazardSystem._broadcastIcebergs()
	local icebergSnapshot = {}
	for _, iceberg in pairs(_icebergs) do
		table.insert(icebergSnapshot, {
			HazardId = iceberg.HazardId,
			Position = iceberg.Position,
			Radius   = iceberg.Radius,
			Size     = iceberg.Size,
		})
	end
	_remotes["HazardStateUpdate"]:FireAllClients({
		Icebergs = icebergSnapshot,
		Storms   = {},
	})
end

-- ─── Internal helpers ─────────────────────────────────────────────────────────

--- Spawn a new storm moving across the map from a random entry path.
function HazardSystem._spawnStorm()
	local path = STORM_PATHS[math.random(1, #STORM_PATHS)]
	-- Normalize direction vector
	local mag = math.sqrt(path.DirX ^ 2 + path.DirZ ^ 2)
	local stormId = Utils.GenerateId("storm")

	_storms[stormId] = {
		Position      = Vector3.new(path.SpawnX, 0, path.SpawnZ),
		VelX          = (path.DirX / mag) * GameConfig.STORM_MOVE_SPEED,
		VelZ          = (path.DirZ / mag) * GameConfig.STORM_MOVE_SPEED,
		TimeRemaining = GameConfig.STORM_DURATION,
	}
end

--- Push a ship's velocity away from an obstacle center to simulate a bounce.
--- Modifies ship.Velocity in-place (server state).
function HazardSystem._pushShipAway(ship: any, obstacleCenter: Vector3, obstacleRadius: number)
	local dx = ship.Position.X - obstacleCenter.X
	local dz = ship.Position.Z - obstacleCenter.Z
	local dist = math.sqrt(dx * dx + dz * dz)

	if dist < 0.01 then
		-- Ships exactly at center (shouldn't happen): push north
		ship.Velocity.X = 0
		ship.Velocity.Z = -50
		return
	end

	-- Unit vector away from obstacle
	local nx = dx / dist
	local nz = dz / dist

	-- Reflect velocity component toward obstacle and add separation impulse
	local dot = ship.Velocity.X * nx + ship.Velocity.Z * nz
	if dot < 0 then
		-- Only reflect if ship is moving toward the obstacle
		ship.Velocity.X = ship.Velocity.X - 2 * dot * nx
		ship.Velocity.Z = ship.Velocity.Z - 2 * dot * nz
	end

	-- Always add a minimum separation push
	local separation = math.max(0, obstacleRadius - dist) * 2
	ship.Velocity.X = ship.Velocity.X + nx * separation
	ship.Velocity.Z = ship.Velocity.Z + nz * separation
end

--- Find a Player object by UserId from a list of players.
function HazardSystem._findPlayerByUserId(userId: number, players: {Player}): Player?
	for _, player in ipairs(players) do
		if player.UserId == userId then
			return player
		end
	end
	return nil
end

-- ─── Queries ──────────────────────────────────────────────────────────────────

--- Return all active storm data (for debugging or GameManager queries).
function HazardSystem.getActiveStorms(): {any}
	local result = {}
	for _, storm in pairs(_storms) do
		table.insert(result, storm)
	end
	return result
end

--- Return all iceberg definitions (static).
function HazardSystem.getIcebergs(): {[string]: any}
	return _icebergs
end

return HazardSystem