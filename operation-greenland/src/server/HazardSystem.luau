-- HazardSystem.luau
-- Server-side environmental hazard system: icebergs, moving storms, shallow water.
-- Interfaces with ShipSystem for damage/movement effects and broadcasts hazard
-- positions to clients for visual effects.
-- Required by: src/server/init.luau
--
-- Integration: init(remotes, shipSystem) -- accepts shared remotes table from
-- GameManager. No RemoteEvent folder is created here.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local Utils = require(Shared:WaitForChild("Utils"))

local HazardSystem = {}

local _icebergs: {[string]: any} = {}
local _storms: {[string]: any} = {}
local _shallowRegions: {any} = {}
local _remotes: {[string]: RemoteEvent} = {}
local _shipSystem: any = nil
local _nextStormSpawn: number = 0
local _active: boolean = false

-- Per-ship iceberg collision cooldown: shipId -> seconds remaining.
-- Without this, a ship overlapping an iceberg at 20Hz takes damage every tick
-- (e.g. Small berg = 50 HP * 20 = 1000 HP/sec). With 1s cooldown = 50 HP/impact.
local _icebergCooldowns: {[string]: number} = {}
local ICEBERG_COLLISION_COOLDOWN = 1.0

-- Iceberg layout: three navigable corridors across the ocean crossing.
local ICEBERG_DEFINITIONS = {
	-- Western field
	{ Position = Vector3.new(-2200, 0, -4000), Size = "Small",  Radius = 40  },
	{ Position = Vector3.new(-1900, 0, -3200), Size = "Small",  Radius = 40  },
	{ Position = Vector3.new(-2500, 0, -2800), Size = "Medium", Radius = 80  },
	{ Position = Vector3.new(-1600, 0, -2100), Size = "Small",  Radius = 40  },
	{ Position = Vector3.new(-2800, 0, -1500), Size = "Large",  Radius = 140 },
	-- Central channel (intentionally sparse -- navigation lane)
	{ Position = Vector3.new(-600,  0, -3800), Size = "Medium", Radius = 80  },
	{ Position = Vector3.new(-300,  0, -2500), Size = "Small",  Radius = 40  },
	{ Position = Vector3.new( 200,  0, -3100), Size = "Medium", Radius = 80  },
	-- Eastern cluster (denser, harder approach)
	{ Position = Vector3.new( 1200, 0, -4200), Size = "Small",  Radius = 40  },
	{ Position = Vector3.new( 1500, 0, -3500), Size = "Large",  Radius = 140 },
	{ Position = Vector3.new( 1800, 0, -2900), Size = "Medium", Radius = 80  },
	{ Position = Vector3.new( 2100, 0, -2200), Size = "Small",  Radius = 40  },
	{ Position = Vector3.new( 2400, 0, -1600), Size = "Medium", Radius = 80  },
	-- Northern approach
	{ Position = Vector3.new(-1000, 0, -800),  Size = "Small",  Radius = 40  },
	{ Position = Vector3.new(  400, 0, -500),  Size = "Small",  Radius = 40  },
}

local ICEBERG_DAMAGE_BY_SIZE = {
	Small  = GameConfig.ICEBERG_SMALL_DAMAGE,
	Medium = GameConfig.ICEBERG_MEDIUM_DAMAGE,
	Large  = GameConfig.ICEBERG_LARGE_DAMAGE,
}

local COLLISION_BUFFER = 20  -- studs beyond visual radius for hull overlap

local SHALLOW_REGION_DEFINITIONS = {
	{ Position = Vector3.new(-800,  0, 5800), Radius = 400 },
	{ Position = Vector3.new(-1800, 0, 4000), Radius = 350 },
	{ Position = Vector3.new( 600,  0, 6400), Radius = 380 },
	{ Position = Vector3.new(-400,  0, 2500), Radius = 320 },
	{ Position = Vector3.new(-2600, 0, 1500), Radius = 300 },
}

local STORM_PATHS = {
	{ SpawnX = -5500, SpawnZ =  -2000, DirX =  1, DirZ =  0.2 },
	{ SpawnX =  5500, SpawnZ =  -1000, DirX = -1, DirZ =  0.1 },
	{ SpawnX = -5500, SpawnZ =   1000, DirX =  1, DirZ = -0.1 },
	{ SpawnX =  5500, SpawnZ =   2000, DirX = -1, DirZ = -0.2 },
}

local STORM_RADIUS = 600  -- studs

-- ─── Initialization ────────────────────────────────────────────────────────────

--- Accept shared remotes from GameManager and inject ShipSystem reference.
--- Call after GameManager.Init() and ShipSystem.init().
function HazardSystem.init(remotes: {[string]: RemoteEvent}, shipSystem: any)
	_remotes    = remotes
	_shipSystem = shipSystem

	for _, def in ipairs(ICEBERG_DEFINITIONS) do
		local id = Utils.GenerateId("iceberg")
		_icebergs[id] = {
			HazardId        = id,
			Position        = def.Position,
			Radius          = def.Radius + COLLISION_BUFFER,
			Size            = def.Size,
			CollisionDamage = ICEBERG_DAMAGE_BY_SIZE[def.Size],
		}
	end

	for _, def in ipairs(SHALLOW_REGION_DEFINITIONS) do
		table.insert(_shallowRegions, { Position = def.Position, Radius = def.Radius })
	end

	_nextStormSpawn = GameConfig.STORM_SPAWN_INTERVAL
end

--- Enable or disable hazard ticking. Broadcasts iceberg layout to clients on activation.
function HazardSystem.setActive(active: boolean)
	_active = active
	if active then
		HazardSystem._broadcastIcebergs()
	end
end

-- ─── Tick ─────────────────────────────────────────────────────────────────────

--- Advance all hazards by dt seconds.
--- allShips: from ShipSystem.getAllShips(), keyed by shipId.
--- players:  from Players:GetPlayers(), for per-player storm VFX events.
function HazardSystem.tick(dt: number, allShips: {[string]: any}, players: {Player})
	if not _active then return end

	-- Tick down iceberg cooldowns
	for shipId, cooldown in pairs(_icebergCooldowns) do
		local remaining = cooldown - dt
		if remaining <= 0 then
			_icebergCooldowns[shipId] = nil
		else
			_icebergCooldowns[shipId] = remaining
		end
	end

	-- Storm spawning
	_nextStormSpawn -= dt
	if _nextStormSpawn <= 0 then
		HazardSystem._spawnStorm()
		_nextStormSpawn = GameConfig.STORM_SPAWN_INTERVAL
	end

	-- Storm movement and expiry
	local expired = {}
	local bounds  = GameConfig.MAP_BOUNDS
	for stormId, storm in pairs(_storms) do
		storm.Position = Vector3.new(
			storm.Position.X + storm.VelX * dt,
			storm.Position.Y,
			storm.Position.Z + storm.VelZ * dt
		)
		storm.TimeRemaining -= dt

		local off = storm.Position.X < bounds.MinX - 1000
			or storm.Position.X > bounds.MaxX + 1000
			or storm.Position.Z < bounds.MinZ - 1000
			or storm.Position.Z > bounds.MaxZ + 1000

		if storm.TimeRemaining <= 0 or off then
			table.insert(expired, stormId)
		end
	end
	for _, id in ipairs(expired) do _storms[id] = nil end

	-- Per-ship hazard checks
	for shipId, ship in pairs(allShips) do
		if not ship.IsAlive then continue end

		-- Iceberg collision (1s cooldown guard prevents 20Hz repeated damage)
		if not _icebergCooldowns[shipId] then
			for _, berg in pairs(_icebergs) do
				if Utils.Distance2D(ship.Position, berg.Position) <= berg.Radius then
					_shipSystem.takeDamage(shipId, berg.CollisionDamage)
					HazardSystem._pushShipAway(ship, berg.Position, berg.Radius)
					_icebergCooldowns[shipId] = ICEBERG_COLLISION_COOLDOWN
					break
				end
			end
		end

		-- Storm damage and state tracking
		local inStorm = false
		for _, storm in pairs(_storms) do
			if Utils.Distance2D(ship.Position, storm.Position) <= STORM_RADIUS then
				inStorm = true
				_shipSystem.takeDamage(shipId, GameConfig.STORM_DAMAGE_PER_SECOND * dt)
				break
			end
		end

		local shipState = _shipSystem.getShip(shipId)
		if shipState then
			local wasInStorm = shipState.InStorm
			_shipSystem.setInStorm(shipId, inStorm)

			if inStorm ~= wasInStorm then
				local player = HazardSystem._findPlayerByUserId(ship.OwnerId, players)
				if player then
					_remotes[inStorm and "StormEntered" or "StormExited"]:FireClient(player, { ShipId = shipId })
				end
			end
		end

		-- Shallow water: Z-band OR harbour-specific circles
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

--- Broadcast current storm positions. Call every ~5 physics ticks.
function HazardSystem.broadcastState()
	local storms = {}
	for stormId, storm in pairs(_storms) do
		table.insert(storms, {
			HazardId = stormId,
			Position = storm.Position,
			Radius   = STORM_RADIUS,
			TimeLeft = storm.TimeRemaining,
		})
	end
	_remotes["HazardUpdate"]:FireAllClients({ Storms = storms })
end

--- Send static iceberg layout to all clients on round activation (called once).
function HazardSystem._broadcastIcebergs()
	local bergs = {}
	for _, berg in pairs(_icebergs) do
		table.insert(bergs, {
			HazardId = berg.HazardId,
			Position = berg.Position,
			Radius   = berg.Radius,
			Size     = berg.Size,
		})
	end
	_remotes["HazardUpdate"]:FireAllClients({ Icebergs = bergs, Storms = {} })
end

-- ─── Internal helpers ─────────────────────────────────────────────────────────

function HazardSystem._spawnStorm()
	local p   = STORM_PATHS[math.random(1, #STORM_PATHS)]
	local mag = math.sqrt(p.DirX ^ 2 + p.DirZ ^ 2)
	local id  = Utils.GenerateId("storm")
	_storms[id] = {
		Position      = Vector3.new(p.SpawnX, 0, p.SpawnZ),
		VelX          = (p.DirX / mag) * GameConfig.STORM_MOVE_SPEED,
		VelZ          = (p.DirZ / mag) * GameConfig.STORM_MOVE_SPEED,
		TimeRemaining = GameConfig.STORM_DURATION,
	}
end

--- Reflect ship velocity away from obstacle center and add separation impulse.
function HazardSystem._pushShipAway(ship: any, center: Vector3, radius: number)
	local dx = ship.Position.X - center.X
	local dz = ship.Position.Z - center.Z
	local d  = math.sqrt(dx * dx + dz * dz)

	if d < 0.01 then ship.Velocity.Z = -50; return end

	local nx  = dx / d
	local nz  = dz / d
	local dot = ship.Velocity.X * nx + ship.Velocity.Z * nz

	if dot < 0 then
		ship.Velocity.X -= 2 * dot * nx
		ship.Velocity.Z -= 2 * dot * nz
	end

	local sep = math.max(0, radius - d) * 2
	ship.Velocity.X += nx * sep
	ship.Velocity.Z += nz * sep
end

function HazardSystem._findPlayerByUserId(userId: number, players: {Player}): Player?
	for _, p in ipairs(players) do
		if p.UserId == userId then return p end
	end
	return nil
end

-- ─── Queries ──────────────────────────────────────────────────────────────────

function HazardSystem.getActiveStorms(): {any}
	local r = {}
	for _, s in pairs(_storms) do table.insert(r, s) end
	return r
end

function HazardSystem.getIcebergs(): {[string]: any}
	return _icebergs
end

return HazardSystem