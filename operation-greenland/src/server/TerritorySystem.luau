-- TerritorySystem.luau
-- Server-side territory capture system.
-- Manages Greenland's coastal capture zones: progress fill/decay, scoring,
-- win condition, and client replication.
-- Required by: src/server/init.luau
--
-- Integration: init(remotes, onVictory, onCapture) -- accepts shared remotes table
-- from GameManager. No RemoteEvent folder is created here.
--
-- tick() shipPositions must be a list of { Position: Vector3, OwnerId: number }
-- so TerritorySystem can credit the right players when a zone flips.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local Utils = require(Shared:WaitForChild("Utils"))

local TerritorySystem = {}

-- Zone definitions: five coastal capture zones along Greenland's coast.
local ZONE_DEFINITIONS = {
	{ ZoneId = "nuuk_harbor",       DisplayName = "Nuuk Harbor",       Position = Vector3.new(-800,  0, 5500), Radius = 250 },
	{ ZoneId = "ilulissat_port",    DisplayName = "Ilulissat Port",    Position = Vector3.new(-1800, 0, 3800), Radius = 220 },
	{ ZoneId = "kangerlussuaq_bay", DisplayName = "Kangerlussuaq Bay", Position = Vector3.new(-400,  0, 2200), Radius = 280 },
	{ ZoneId = "narsarsuaq_dock",   DisplayName = "Narsarsuaq Dock",   Position = Vector3.new( 600,  0, 6200), Radius = 200 },
	{ ZoneId = "thule_base",        DisplayName = "Thule Base",        Position = Vector3.new(-2600, 0, 1200), Radius = 240 },
}

local _zones: {[string]: any} = {}
local _score: number = 0
local _active: boolean = false
local _remotes: {[string]: RemoteEvent} = {}
local _onVictory: ((string) -> ())?
local _onCapture: ((number) -> ())?  -- called with userId for each ship in zone at flip

-- ─── Initialization ────────────────────────────────────────────────────────────

--- Accept the shared remotes table from GameManager and set up zone states.
---   onVictory(reason) -- "AllZonesCaptured" | "ScoreReached"
---   onCapture(userId) -- called for each contributing player when a zone flips
---
--- Bootstrap wiring example:
---   TerritorySystem.init(
---     GameManager.GetRemotes(),
---     GameManager.TriggerVictory,
---     function(userId) GameManager.AddCapture(Players:GetPlayerByUserId(userId)) end
---   )
function TerritorySystem.init(
	remotes: {[string]: RemoteEvent},
	onVictory: ((string) -> ())?,
	onCapture: ((number) -> ())?
)
	_remotes   = remotes
	_onVictory = onVictory
	_onCapture = onCapture

	for _, def in ipairs(ZONE_DEFINITIONS) do
		_zones[def.ZoneId] = {
			ZoneId          = def.ZoneId,
			DisplayName     = def.DisplayName,
			Position        = def.Position,
			Radius          = def.Radius,
			Owner           = "Neutral",
			CaptureProgress = 0,      -- 0-100
			Contested       = false,  -- always false in co-op; kept for future PvP use
		}
	end
end

--- Enable or disable territory ticking. Call setActive(true) when Combat phase begins.
function TerritorySystem.setActive(active: boolean)
	_active = active
end

-- ─── Tick ─────────────────────────────────────────────────────────────────────

--- Advance territory logic by dt seconds.
--- shipPositions: list of { Position: Vector3, OwnerId: number } for all alive ships.
---
--- Build from ShipSystem.getAllShips():
---   local positions = {}
---   for _, ship in pairs(ShipSystem.getAllShips()) do
---     if ship.IsAlive then
---       table.insert(positions, { Position = ship.Position, OwnerId = ship.OwnerId })
---     end
---   end
function TerritorySystem.tick(dt: number, shipPositions: {{Position: Vector3, OwnerId: number}})
	if not _active then return end

	local allCaptured = true
	local scoreGained = 0

	for _, zone in pairs(_zones) do
		local shipsInZone    = 0
		local ownerIdsInZone: {number} = {}

		for _, snap in ipairs(shipPositions) do
			if Utils.IsInZone(snap.Position, zone.Position, zone.Radius) then
				shipsInZone += 1
				table.insert(ownerIdsInZone, snap.OwnerId)
			end
		end

		if zone.Owner == "USFleet" then
			scoreGained += GameConfig.SCORE_PER_ZONE_PER_SECOND * dt

		elseif shipsInZone > 0 then
			-- Fill progress; more ships = faster capture
			local rate = GameConfig.CAPTURE_RATE_PER_SHIP * shipsInZone * dt
			zone.CaptureProgress = math.min(GameConfig.CAPTURE_MAX_PROGRESS, zone.CaptureProgress + rate)

			if zone.CaptureProgress >= GameConfig.CAPTURE_MAX_PROGRESS then
				zone.CaptureProgress = GameConfig.CAPTURE_MAX_PROGRESS
				zone.Owner = "USFleet"

				_remotes["ZoneCaptured"]:FireAllClients({
					ZoneId      = zone.ZoneId,
					DisplayName = zone.DisplayName,
					NewOwner    = "USFleet",
				})

				-- Credit each player who was in the zone at the moment of flip
				if _onCapture then
					for _, userId in ipairs(ownerIdsInZone) do
						_onCapture(userId)
					end
				end
			end

		elseif zone.CaptureProgress > 0 then
			-- No ships present: partial progress decays
			zone.CaptureProgress = math.max(0, zone.CaptureProgress - GameConfig.CAPTURE_DECAY_RATE * dt)
		end

		if zone.Owner ~= "USFleet" then
			allCaptured = false
		end
	end

	if scoreGained > 0 then
		_score += scoreGained
		_remotes["ScoreUpdate"]:FireAllClients({ Score = math.floor(_score) })
	end

	if allCaptured and _onVictory then
		_active = false
		_onVictory("AllZonesCaptured")
		return
	end

	if _score >= GameConfig.VICTORY_SCORE and _onVictory then
		_active = false
		_onVictory("ScoreReached")
	end
end

-- ─── Replication ──────────────────────────────────────────────────────────────

--- Broadcast full territory state to all clients. Call every ~10 physics ticks.
function TerritorySystem.broadcastState()
	local snapshot = {}
	for _, zone in pairs(_zones) do
		table.insert(snapshot, {
			ZoneId          = zone.ZoneId,
			DisplayName     = zone.DisplayName,
			Position        = zone.Position,
			Radius          = zone.Radius,
			Owner           = zone.Owner,
			CaptureProgress = zone.CaptureProgress,
			Contested       = zone.Contested,
		})
	end
	_remotes["TerritoryUpdate"]:FireAllClients(snapshot)
end

-- ─── Queries ──────────────────────────────────────────────────────────────────

function TerritorySystem.getAllZones(): {any}
	local r = {}
	for _, z in pairs(_zones) do table.insert(r, z) end
	return r
end

function TerritorySystem.getZone(zoneId: string): any
	return _zones[zoneId]
end

function TerritorySystem.getScore(): number
	return _score
end

function TerritorySystem.getCapturedZoneCount(): number
	local n = 0
	for _, z in pairs(_zones) do if z.Owner == "USFleet" then n += 1 end end
	return n
end

function TerritorySystem.getTotalZoneCount(): number
	return #ZONE_DEFINITIONS
end

return TerritorySystem