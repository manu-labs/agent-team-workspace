-- TerritorySystem.luau
-- Server-side territory capture system.
-- Manages Greenland's coastal capture zones: progress fill/decay/contested logic,
-- per-zone scoring, win condition, and minimap replication.
-- Required by: src/server/init.luau

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared:WaitForChild("GameConfig"))
local Utils = require(Shared:WaitForChild("Utils"))

local TerritorySystem = {}

-- ─── Zone definitions ──────────────────────────────────────────────────────────
-- Five coastal capture zones distributed along Greenland's southern and western coast.
-- Position.X/Z are map coordinates; Radius is the circular capture area in studs.

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

-- Live zone states, keyed by ZoneId
local _zones: {[string]: any} = {}

-- Accumulated score for the US Fleet
local _score: number = 0

-- Whether the game is currently active (scoring paused outside of Active phase)
local _active: boolean = false

-- RemoteEvents
local _remotes: {[string]: RemoteEvent} = {}

-- Callback fired when the win condition is met: (reason: string) -> ()
local _onVictory: ((string) -> ())?

-- ─── Initialization ────────────────────────────────────────────────────────────

--- Set up zone state and RemoteEvents.
---  is called with a reason string when the US Fleet wins.
function TerritorySystem.init(onVictory: ((string) -> ())?)
	_onVictory = onVictory

	-- Build initial zone states from definitions
	for _, def in ipairs(ZONE_DEFINITIONS) do
		_zones[def.ZoneId] = {
			ZoneId          = def.ZoneId,
			DisplayName     = def.DisplayName,
			Position        = def.Position,
			Radius          = def.Radius,
			Owner           = "Neutral",    -- starts uncontrolled
			CaptureProgress = 0,             -- 0–100
			Contested       = false,
		}
	end

	-- Create RemoteEvents for minimap/HUD replication
	local eventsFolder = Instance.new("Folder")
	eventsFolder.Name = "TerritoryEvents"
	eventsFolder.Parent = ReplicatedStorage

	local function makeRemote(name: string): RemoteEvent
		local e = Instance.new("RemoteEvent")
		e.Name = name
		e.Parent = eventsFolder
		_remotes[name] = e
		return e
	end

	makeRemote("TerritoryStateUpdate")  -- Server → All: full zone snapshot (minimap)
	makeRemote("ZoneCaptured")          -- Server → All: a zone changed owner
	makeRemote("ScoreUpdate")           -- Server → All: current score changed
end

--- Mark the territory system as active or paused (tied to game phase).
function TerritorySystem.setActive(active: boolean)
	_active = active
end

-- ─── Tick ─────────────────────────────────────────────────────────────────────

--- Advance territory logic by  seconds.
---  is a list of { Position: Vector3 } for all currently alive ships.
--- Call this from the main server loop at the same rate as ShipSystem.tick().
function TerritorySystem.tick(dt: number, shipPositions: {{Position: Vector3}})
	if not _active then return end

	local allCaptured = true
	local scoreGained = 0

	for _, zone in pairs(_zones) do
		-- Count how many live ships are inside this zone
		local shipsInZone = 0
		for _, shipSnap in ipairs(shipPositions) do
			if Utils.IsInZone(shipSnap.Position, zone.Position, zone.Radius) then
				shipsInZone += 1
			end
		end

		-- Contested = NPC defense is active and ships are present
		-- (Simplified: a zone is contested if it's Neutral and ships are inside)
		zone.Contested = (zone.Owner == "Neutral" and shipsInZone > 0)

		local prevProgress = zone.CaptureProgress
		local prevOwner    = zone.Owner

		if zone.Owner == "USFleet" then
			-- Already captured — accumulate score and skip progress logic
			scoreGained += GameConfig.SCORE_PER_ZONE_PER_SECOND * dt

		elseif shipsInZone > 0 and not zone.Contested then
			-- Uncontested capture: fill progress (more ships = faster)
			local rate = GameConfig.CAPTURE_RATE_PER_SHIP * shipsInZone * dt
			zone.CaptureProgress = math.min(GameConfig.CAPTURE_MAX_PROGRESS, zone.CaptureProgress + rate)

			if zone.CaptureProgress >= GameConfig.CAPTURE_MAX_PROGRESS then
				zone.CaptureProgress = GameConfig.CAPTURE_MAX_PROGRESS
				zone.Owner = "USFleet"
				zone.Contested = false

				-- Notify all clients of the ownership change
				_remotes["ZoneCaptured"]:FireAllClients({
					ZoneId      = zone.ZoneId,
					DisplayName = zone.DisplayName,
					NewOwner    = "USFleet",
				})
			end

		elseif shipsInZone == 0 and zone.Owner == "Neutral" and zone.CaptureProgress > 0 then
			-- No ships present — progress decays back toward 0
			zone.CaptureProgress = math.max(0, zone.CaptureProgress - GameConfig.CAPTURE_DECAY_RATE * dt)

		elseif zone.Contested then
			-- Contested: progress is frozen while NPC defense is active
			-- (progress neither fills nor decays)
		end

		if zone.Owner ~= "USFleet" then
			allCaptured = false
		end

		-- Unused: prevProgress / prevOwner held for future change-detection events
		_ = prevProgress
		_ = prevOwner
	end

	-- Accumulate score
	if scoreGained > 0 then
		_score += scoreGained
		_remotes["ScoreUpdate"]:FireAllClients({ Score = math.floor(_score) })
	end

	-- ── Win condition checks ──────────────────────────────────────────────
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

--- Broadcast the full territory state to all clients (minimap data).
--- Call periodically from the main server loop (e.g. every 10 ticks).
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
	_remotes["TerritoryStateUpdate"]:FireAllClients(snapshot)
end

-- ─── Queries ──────────────────────────────────────────────────────────────────

--- Return a list of all zone states (read-only snapshot for other systems).
function TerritorySystem.getAllZones(): {any}
	local result = {}
	for _, zone in pairs(_zones) do
		table.insert(result, zone)
	end
	return result
end

--- Return the zone state for a given ZoneId, or nil.
function TerritorySystem.getZone(zoneId: string): any
	return _zones[zoneId]
end

--- Return the current US Fleet score.
function TerritorySystem.getScore(): number
	return _score
end

--- Return the number of zones currently owned by the US Fleet.
function TerritorySystem.getCapturedZoneCount(): number
	local count = 0
	for _, zone in pairs(_zones) do
		if zone.Owner == "USFleet" then
			count += 1
		end
	end
	return count
end

--- Return the total number of zones.
function TerritorySystem.getTotalZoneCount(): number
	return #ZONE_DEFINITIONS
end

return TerritorySystem