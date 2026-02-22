-- tests/TerritorySystem.test.luau
-- Unit tests for TerritorySystem capture math.
--
-- Tests the core algorithms (progress fill, decay, zone flip, win conditions)
-- independently of Roblox APIs. Constants mirror GameConfig / TerritorySystem.

local Assert = require("./mocks/assert")
local Vector3 = require("./mocks/Vector3")

-- ─── Constants (mirror GameConfig / TerritorySystem) ──────────────────────────

local CAPTURE_RATE_PER_SHIP = 10 -- progress points per ship per second
local CAPTURE_DECAY_RATE = 5 -- points lost per second when zone is empty
local CAPTURE_MAX_PROGRESS = 100
local SCORE_PER_ZONE_PER_SECOND = 2

-- ─── Pure logic helpers (mirror TerritorySystem.tick capture block) ───────────

--- Advance capture progress for one zone over dt seconds.
local function advanceProgress(progress: number, shipsInZone: number, dt: number): number
	if shipsInZone > 0 then
		local rate = CAPTURE_RATE_PER_SHIP * shipsInZone * dt
		return math.min(CAPTURE_MAX_PROGRESS, progress + rate)
	elseif progress > 0 then
		return math.max(0, progress - CAPTURE_DECAY_RATE * dt)
	end
	return progress
end

--- Returns true when all zone owners equal "USFleet".
local function allCaptured(owners: { string }): boolean
	for _, o in ipairs(owners) do
		if o ~= "USFleet" then
			return false
		end
	end
	return true
end

--- Returns true when score meets or exceeds a threshold.
local function scoreReached(score: number, threshold: number): boolean
	return score >= threshold
end

--- 2D distance check for IsInZone (mirrors Utils.IsInZone).
local function isInZone(pos: Vector3.Vector3Type, centre: Vector3.Vector3Type, radius: number): boolean
	return Vector3.distance2D(pos, centre) <= radius
end

print("=== TerritorySystem ===\n")

-- ─── Capture fill tests ───────────────────────────────────────────────────────

Assert.test("one ship fills progress at CAPTURE_RATE_PER_SHIP per second", function()
	local p = advanceProgress(0, 1, 1)
	Assert.close(p, CAPTURE_RATE_PER_SHIP)
end)

Assert.test("two ships fill progress at 2× CAPTURE_RATE_PER_SHIP per second", function()
	local p = advanceProgress(0, 2, 1)
	Assert.close(p, CAPTURE_RATE_PER_SHIP * 2)
end)

Assert.test("three ships fill faster proportionally", function()
	local one = advanceProgress(0, 1, 1)
	local three = advanceProgress(0, 3, 1)
	Assert.close(three, one * 3)
end)

Assert.test("progress is clamped at CAPTURE_MAX_PROGRESS", function()
	local p = advanceProgress(99, 1, 100) -- huge dt
	Assert.equal(p, CAPTURE_MAX_PROGRESS)
end)

Assert.test("progress fills correctly with fractional dt", function()
	local p = advanceProgress(0, 1, 0.05) -- 50ms physics tick
	Assert.close(p, CAPTURE_RATE_PER_SHIP * 0.05)
end)

Assert.test("partial progress plus fill stays correct", function()
	local p = advanceProgress(50, 1, 1)
	Assert.close(p, 50 + CAPTURE_RATE_PER_SHIP)
end)

-- ─── Decay tests ──────────────────────────────────────────────────────────────

Assert.test("progress decays when no ships present", function()
	local p = advanceProgress(50, 0, 1)
	Assert.close(p, 50 - CAPTURE_DECAY_RATE)
end)

Assert.test("decay does not drop below zero", function()
	local p = advanceProgress(1, 0, 100)
	Assert.equal(p, 0)
end)

Assert.test("decay does not change zero progress", function()
	local p = advanceProgress(0, 0, 10)
	Assert.equal(p, 0)
end)

Assert.test("decay rate is CAPTURE_DECAY_RATE per second", function()
	local p = advanceProgress(20, 0, 1)
	Assert.close(p, 20 - CAPTURE_DECAY_RATE)
end)

-- ─── Zone flip tests ──────────────────────────────────────────────────────────

Assert.test("zone flips when progress reaches 100", function()
	local p = advanceProgress(95, 1, 1) -- 95 + 10 = 105 → clamped to 100
	Assert.equal(p >= CAPTURE_MAX_PROGRESS, true)
end)

Assert.test("zone does not flip before reaching 100", function()
	local p = advanceProgress(0, 1, 0.01)
	Assert.equal(p >= CAPTURE_MAX_PROGRESS, false)
end)

Assert.test("zone at exactly 99.9 with tiny dt does not flip", function()
	local p = advanceProgress(99.9, 1, 0.001) -- +0.01 → still < 100? No: 99.9+0.01=99.91
	-- 0.001 * 10 = 0.01; 99.9 + 0.01 = 99.91
	Assert.equal(p >= CAPTURE_MAX_PROGRESS, false)
end)

Assert.test("zone at 99.99 with 1s dt flips", function()
	local p = advanceProgress(99.99, 1, 1) -- +10 → 109.99 → clamped to 100
	Assert.equal(p, CAPTURE_MAX_PROGRESS)
end)

-- ─── Win condition tests ───────────────────────────────────────────────────────

Assert.test("AllZonesCaptured: all five zones owned fires victory", function()
	Assert.equal(allCaptured({ "USFleet", "USFleet", "USFleet", "USFleet", "USFleet" }), true)
end)

Assert.test("AllZonesCaptured: four out of five does not trigger", function()
	Assert.equal(allCaptured({ "USFleet", "USFleet", "USFleet", "USFleet", "Neutral" }), false)
end)

Assert.test("AllZonesCaptured: no zones does not trigger", function()
	Assert.equal(allCaptured({ "Neutral", "Neutral", "Neutral", "Neutral", "Neutral" }), false)
end)

Assert.test("ScoreReached: score at threshold triggers victory", function()
	Assert.equal(scoreReached(500, 500), true)
end)

Assert.test("ScoreReached: score below threshold does not trigger", function()
	Assert.equal(scoreReached(499, 500), false)
end)

Assert.test("score accumulates correctly per zone per second", function()
	local score = 0
	for _ = 1, 10 do -- 10 seconds, 3 zones owned
		score += SCORE_PER_ZONE_PER_SECOND * 3 * 1
	end
	Assert.close(score, 60)
end)

-- ─── IsInZone geometry tests ──────────────────────────────────────────────────

Assert.test("ship at zone centre is in zone", function()
	local centre = Vector3.new(0, 0, 0)
	local ship = Vector3.new(0, 0, 0)
	Assert.equal(isInZone(ship, centre, 250), true)
end)

Assert.test("ship inside radius is in zone", function()
	local centre = Vector3.new(100, 0, 100)
	local ship = Vector3.new(200, 0, 100) -- 100 studs away
	Assert.equal(isInZone(ship, centre, 150), true)
end)

Assert.test("ship outside radius is not in zone", function()
	local centre = Vector3.new(0, 0, 0)
	local ship = Vector3.new(300, 0, 0) -- 300 studs away
	Assert.equal(isInZone(ship, centre, 250), false)
end)

Assert.test("Y height difference does not affect IsInZone (2D check)", function()
	local centre = Vector3.new(0, 0, 0)
	local ship = Vector3.new(0, 9999, 0) -- high Y, but X/Z match
	Assert.equal(isInZone(ship, centre, 1), true)
end)

Assert.test("ship exactly on radius boundary is in zone", function()
	local centre = Vector3.new(0, 0, 0)
	local ship = Vector3.new(250, 0, 0)
	Assert.equal(isInZone(ship, centre, 250), true)
end)

Assert.summary("TerritorySystem")
