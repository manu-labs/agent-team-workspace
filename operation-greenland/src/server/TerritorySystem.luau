-- TerritorySystem.luau
-- Server-side territory capture system.
-- Manages Greenland's coastal capture zones: progress fill/decay, scoring,
-- win condition, and client replication.
-- Required by: src/server/init.luau
--
-- Integration: init(remotes, onVictory) — accepts shared remotes table from
-- GameManager. No RemoteEvent folder is created here.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local Utils = require(Shared:WaitForChild("Utils"))

local TerritorySystem = {}

-- ─── Zone definitions ──────────────────────────────────────────────────────────
-- Five coastal capture zones distributed along Greenland's coast.

local ZONE_DEFINITIONS = {
	{
		ZoneId      = "nuuk_harbor",
		DisplayName = "Nuuk Harbor",
		Position    = Vector3.new(-800, 0, 5500),
		Radius      = 250,
	},
	{
		ZoneId      = "ilulissat_port",
		DisplayName = "Ilulissat Port",
		Position    = Vector3.new(-1800, 0, 3800),
		Radius      = 220,
	},
	{
		ZoneId      = "kangerlussuaq_bay",
		DisplayName = "Kangerlussuaq Bay",
		Position    = Vector3.new(-400, 0, 2200),
		Radius      = 280,
	},
	{
		ZoneId      = "narsarsuaq_dock",
		DisplayName = "Narsarsuaq Dock",
		Position    = Vector3.new(600, 0, 6200),
		Radius      = 200,
	},
	{
		ZoneId      = "thule_base",
		DisplayName = "Thule Base",
		Position    = Vector3.new(-2600, 0, 1200),
		Radius      = 240,
	},
}

-- ─── Internal state ────────────────────────────────────────────────────────────

local _zones: {[string]: any} = {}
local _score: number = 0
local _active: boolean = false
local _remotes: {[string]: RemoteEvent} = {}
local _onVictory: ((string) -> ())?

-- ─── Initialization ────────────────────────────────────────────────────────────

--- Accept the shared remotes table from GameManager and set up zone states.
---  is called with a reason string ("AllZonesCaptured" | "ScoreReached")
--- when the US Fleet meets the win condition.
function TerritorySystem.init(remotes: {[string]: RemoteEvent}, onVictory: ((string) -> ())?)
	_remotes   = remotes
	_onVictory = onVictory

	for _, def in ipairs(ZONE_DEFINITIONS) do
		_zones[def.ZoneId] = {
			ZoneId          = def.ZoneId,
			DisplayName     = def.DisplayName,
			Position        = def.Position,
			Radius          = def.Radius,
			Owner           = "Neutral",
			CaptureProgress = 0,    -- 0–100
			-- Contested is always false in co-op mode (no NPC defenders).
			-- Field kept in state for potential future PvP use.
			Contested       = false,
		}
	end
end

--- Enable or disable territory ticking (call setActive(true) when round starts).
function TerritorySystem.setActive(active: boolean)
	_active = active
end

-- ─── Tick ─────────────────────────────────────────────────────────────────────

--- Advance territory logic by  seconds.
---  is a list of { Position: Vector3 } for all currently alive ships.
--- Call from the main server loop at the same rate as ShipSystem.tick().
function TerritorySystem.tick(dt: number, shipPositions: {{Position: Vector3}})
	if not _active then return end

	local allCaptured = true
	local scoreGained = 0

	for _, zone in pairs(_zones) do
		-- Count ships currently inside this zone
		local shipsInZone = 0
		for _, shipSnap in ipairs(shipPositions) do
			if Utils.IsInZone(shipSnap.Position, zone.Position, zone.Radius) then
				shipsInZone += 1
			end
		end

		if zone.Owner == "USFleet" then
			-- Held zone: accumulate score each tick
			scoreGained += GameConfig.SCORE_PER_ZONE_PER_SECOND * dt

		elseif shipsInZone > 0 then
			-- Ships present in a neutral zone: fill capture progress.
			-- More ships = faster capture (linear scaling).
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
			end

		elseif shipsInZone == 0 and zone.CaptureProgress > 0 then
			-- No ships present: partial progress decays back toward 0
			zone.CaptureProgress = math.max(0, zone.CaptureProgress - GameConfig.CAPTURE_DECAY_RATE * dt)
		end

		if zone.Owner ~= "USFleet" then
			allCaptured = false
		end
	end

	-- Broadcast score if it changed
	if scoreGained > 0 then
		_score += scoreGained
		_remotes["ScoreUpdate"]:FireAllClients({ Score = math.floor(_score) })
	end

	-- Win condition: all zones captured
	if allCaptured and _onVictory then
		_active = false
		_onVictory("AllZonesCaptured")
		return
	end

	-- Win condition: score target reached
	if _score >= GameConfig.VICTORY_SCORE and _onVictory then
		_active = false
		_onVictory("ScoreReached")
	end
end

-- ─── Replication ──────────────────────────────────────────────────────────────

--- Broadcast the full territory state to all clients for minimap and HUD.
--- Call every ~10 physics ticks from the main loop.
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
	_remotes["TerritoryUpdated"]:FireAllClients(snapshot)
end

-- ─── Queries ──────────────────────────────────────────────────────────────────

function TerritorySystem.getAllZones(): {any}
	local result = {}
	for _, zone in pairs(_zones) do
		table.insert(result, zone)
	end
	return result
end

function TerritorySystem.getZone(zoneId: string): any
	return _zones[zoneId]
end

function TerritorySystem.getScore(): number
	return _score
end

function TerritorySystem.getCapturedZoneCount(): number
	local count = 0
	for _, zone in pairs(_zones) do
		if zone.Owner == "USFleet" then count += 1 end
	end
	return count
end

function TerritorySystem.getTotalZoneCount(): number
	return #ZONE_DEFINITIONS
end

return TerritorySystem