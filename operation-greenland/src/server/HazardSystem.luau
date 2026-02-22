-- HazardSystem.luau
-- Server-side environmental hazard system: icebergs, moving storms, shallow water.
-- Interfaces with ShipSystem for damage/movement effects and broadcasts hazard
-- positions to clients for visual effects.
-- Required by: src/server/init.luau
--
-- Integration: init(remotes, shipSystem) — accepts shared remotes table from
-- GameManager. No RemoteEvent folder is created here.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local Utils = require(Shared:WaitForChild("Utils"))

local HazardSystem = {}

-- ─── Internal state ────────────────────────────────────────────────────────────

local _icebergs: {[string]: any} = {}
local _storms: {[string]: any} = {}
local _shallowRegions: {any} = {}
local _remotes: {[string]: RemoteEvent} = {}
local _shipSystem: any = nil
local _nextStormSpawn: number = 0
local _active: boolean = false

-- Per-ship iceberg collision cooldown: shipId → seconds remaining.
-- Prevents repeated damage at 20 Hz while a ship overlaps an iceberg.
local _icebergCooldowns: {[string]: number} = {}
local ICEBERG_COLLISION_COOLDOWN = 1.0  -- seconds between iceberg hits per ship

-- ─── Iceberg layout ───────────────────────────────────────────────────────────

local ICEBERG_DEFINITIONS = {
	-- Western field
	{ Position = Vector3.new(-2200, 0, -4000), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new(-1900, 0, -3200), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new(-2500, 0, -2800), Size = "Medium", Radius = 80 },
	{ Position = Vector3.new(-1600, 0, -2100), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new(-2800, 0, -1500), Size = "Large",  Radius = 140 },
	-- Central channel (intentional navigation lane — kept sparse)
	{ Position = Vector3.new(-600,  0, -3800), Size = "Medium", Radius = 80 },
	{ Position = Vector3.new(-300,  0, -2500), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new( 200,  0, -3100), Size = "Medium", Radius = 80 },
	-- Eastern cluster (denser approach)
	{ Position = Vector3.new( 1200, 0, -4200), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new( 1500, 0, -3500), Size = "Large",  Radius = 140 },
	{ Position = Vector3.new( 1800, 0, -2900), Size = "Medium", Radius = 80 },
	{ Position = Vector3.new( 2100, 0, -2200), Size = "Small",  Radius = 40 },
	{ Position = Vector3.new( 2400, 0, -1600), Size = "Medium", Radius = 80 },
	-- Northern approach
	{ Position = Vector3.new(-1000, 0, -800),  Size = "Small",  Radius = 40 },
	{ Position = Vector3.new(  400, 0, -500),  Size = "Small",  Radius = 40 },
}

local ICEBERG_DAMAGE_BY_SIZE = {
	Small  = GameConfig.ICEBERG_SMALL_DAMAGE,
	Medium = GameConfig.ICEBERG_MEDIUM_DAMAGE,
	Large  = GameConfig.ICEBERG_LARGE_DAMAGE,
}

local COLLISION_BUFFER = 20  -- studs added to visual radius for hull overlap

-- ─── Shallow water regions ─────────────────────────────────────────────────────

local SHALLOW_REGION_DEFINITIONS = {
	{ Position = Vector3.new(-800,  0, 5800), Radius = 400 },
	{ Position = Vector3.new(-1800, 0, 4000), Radius = 350 },
	{ Position = Vector3.new( 600,  0, 6400), Radius = 380 },
	{ Position = Vector3.new(-400,  0, 2500), Radius = 320 },
	{ Position = Vector3.new(-2600, 0, 1500), Radius = 300 },
}

-- ─── Storm paths ──────────────────────────────────────────────────────────────

local STORM_PATHS = {
	{ SpawnX = -5500, SpawnZ =  -2000, DirX =  1, DirZ =  0.2 },
	{ SpawnX =  5500, SpawnZ =  -1000, DirX = -1, DirZ =  0.1 },
	{ SpawnX = -5500, SpawnZ =   1000, DirX =  1, DirZ = -0.1 },
	{ SpawnX =  5500, SpawnZ =   2000, DirX = -1, DirZ = -0.2 },
}

local STORM_RADIUS = 600  -- studs

-- ─── Initialization ────────────────────────────────────────────────────────────

--- Accept shared remotes from GameManager and inject ShipSystem reference.
--- Must be called after GameManager.Init() and ShipSystem.init().
function HazardSystem.init(remotes: {[string]: RemoteEvent}, shipSystem: any)
	_remotes    = remotes
	_shipSystem = shipSystem

	-- Build iceberg instances
	for _, def in ipairs(ICEBERG_DEFINITIONS) do
		local hazardId = Utils.GenerateId("iceberg")
		_icebergs[hazardId] = {
			HazardId        = hazardId,
			Position        = def.Position,
			Radius          = def.Radius + COLLISION_BUFFER,
			Size            = def.Size,
			CollisionDamage = ICEBERG_DAMAGE_BY_SIZE[def.Size],
		}
	end

	-- Build shallow regions
	for _, def in ipairs(SHALLOW_REGION_DEFINITIONS) do
		table.insert(_shallowRegions, { Position = def.Position, Radius = def.Radius })
	end

	_nextStormSpawn = GameConfig.STORM_SPAWN_INTERVAL
end

--- Enable or disable hazard ticking. Sends iceberg layout to clients when activated.
function HazardSystem.setActive(active: boolean)
	_active = active
	if active then
		HazardSystem._broadcastIcebergs()
	end
end

-- ─── Tick ─────────────────────────────────────────────────────────────────────

--- Advance all hazards by  seconds.
---  — from ShipSystem.getAllShips(), keyed by shipId.
---   — from Players:GetPlayers(), for per-player storm VFX events.
function HazardSystem.tick(dt: number, allShips: {[string]: any}, players: {Player})
	if not _active then return end

	-- ── Tick down iceberg cooldowns ───────────────────────────────────────
	for shipId, cooldown in pairs(_icebergCooldowns) do
		local remaining = cooldown - dt
		if remaining <= 0 then
			_icebergCooldowns[shipId] = nil
		else
			_icebergCooldowns[shipId] = remaining
		end
	end

	-- ── Storm spawning ────────────────────────────────────────────────────
	_nextStormSpawn -= dt
	if _nextStormSpawn <= 0 then
		HazardSystem._spawnStorm()
		_nextStormSpawn = GameConfig.STORM_SPAWN_INTERVAL
	end

	-- ── Storm movement & expiry ───────────────────────────────────────────
	local expiredStorms = {}
	local bounds = GameConfig.MAP_BOUNDS
	for stormId, storm in pairs(_storms) do
		storm.Position = Vector3.new(
			storm.Position.X + storm.VelX * dt,
			storm.Position.Y,
			storm.Position.Z + storm.VelZ * dt
		)
		storm.TimeRemaining -= dt

		local offMap = storm.Position.X < bounds.MinX - 1000
			or storm.Position.X > bounds.MaxX + 1000
			or storm.Position.Z < bounds.MinZ - 1000
			or storm.Position.Z > bounds.MaxZ + 1000

		if storm.TimeRemaining <= 0 or offMap then
			table.insert(expiredStorms, stormId)
		end
	end
	for _, stormId in ipairs(expiredStorms) do
		_storms[stormId] = nil
	end

	-- ── Per-ship hazard checks ────────────────────────────────────────────
	for shipId, ship in pairs(allShips) do
		if not ship.IsAlive then continue end

		-- Iceberg collision (guarded by per-ship cooldown)
		if not _icebergCooldowns[shipId] then
			for _, iceberg in pairs(_icebergs) do
				if Utils.Distance2D(ship.Position, iceberg.Position) <= iceberg.Radius then
					_shipSystem.takeDamage(shipId, iceberg.CollisionDamage)
					HazardSystem._pushShipAway(ship, iceberg.Position, iceberg.Radius)
					_icebergCooldowns[shipId] = ICEBERG_COLLISION_COOLDOWN
					break  -- one iceberg hit per cooldown window
				end
			end
		end

		-- Storm presence and damage
		local inStorm = false
		for _, storm in pairs(_storms) do
			if Utils.Distance2D(ship.Position, storm.Position) <= STORM_RADIUS then
				inStorm = true
				_shipSystem.takeDamage(shipId, GameConfig.STORM_DAMAGE_PER_SECOND * dt)
				break
			end
		end

		-- Update ShipSystem storm flag and fire enter/exit VFX events
		local shipState = _shipSystem.getShip(shipId)
		if shipState then
			local wasInStorm = shipState.InStorm
			_shipSystem.setInStorm(shipId, inStorm)

			if inStorm ~= wasInStorm then
				local player = HazardSystem._findPlayerByUserId(ship.OwnerId, players)
				if player then
					local eventName = inStorm and "StormEntered" or "StormExited"
					_remotes[eventName]:FireClient(player, { ShipId = shipId })
				end
			end
		end

		-- Shallow water: Z-band threshold OR specific harbour circles
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

--- Broadcast current storm positions to all clients (~every 5 ticks).
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
	_remotes["HazardUpdate"]:FireAllClients({ Storms = stormSnapshot })
end

--- Send static iceberg layout once to all clients on round start.
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
	_remotes["HazardUpdate"]:FireAllClients({ Icebergs = icebergSnapshot, Storms = {} })
end

-- ─── Internal helpers ─────────────────────────────────────────────────────────

function HazardSystem._spawnStorm()
	local path = STORM_PATHS[math.random(1, #STORM_PATHS)]
	local mag   = math.sqrt(path.DirX ^ 2 + path.DirZ ^ 2)
	local id    = Utils.GenerateId("storm")
	_storms[id] = {
		Position      = Vector3.new(path.SpawnX, 0, path.SpawnZ),
		VelX          = (path.DirX / mag) * GameConfig.STORM_MOVE_SPEED,
		VelZ          = (path.DirZ / mag) * GameConfig.STORM_MOVE_SPEED,
		TimeRemaining = GameConfig.STORM_DURATION,
	}
end

--- Reflect ship velocity away from an obstacle and add a separation impulse.
function HazardSystem._pushShipAway(ship: any, center: Vector3, radius: number)
	local dx   = ship.Position.X - center.X
	local dz   = ship.Position.Z - center.Z
	local dist = math.sqrt(dx * dx + dz * dz)

	if dist < 0.01 then
		ship.Velocity.Z = -50  -- degenerate case: push north
		return
	end

	local nx  = dx / dist
	local nz  = dz / dist
	local dot = ship.Velocity.X * nx + ship.Velocity.Z * nz

	if dot < 0 then
		-- Reflect the inward velocity component
		ship.Velocity.X -= 2 * dot * nx
		ship.Velocity.Z -= 2 * dot * nz
	end

	-- Minimum separation impulse so ship exits the collision zone
	local sep = math.max(0, radius - dist) * 2
	ship.Velocity.X += nx * sep
	ship.Velocity.Z += nz * sep
end

function HazardSystem._findPlayerByUserId(userId: number, players: {Player}): Player?
	for _, player in ipairs(players) do
		if player.UserId == userId then return player end
	end
	return nil
end

-- ─── Queries ──────────────────────────────────────────────────────────────────

function HazardSystem.getActiveStorms(): {any}
	local result = {}
	for _, storm in pairs(_storms) do table.insert(result, storm) end
	return result
end

function HazardSystem.getIcebergs(): {[string]: any}
	return _icebergs
end

return HazardSystem