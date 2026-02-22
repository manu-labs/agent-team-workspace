-- test_game_config.luau
-- Lune unit tests for operation-greenland/src/shared/GameConfig.luau.
-- Run from the operation-greenland/ directory: lune run tests/test_game_config.luau
--
-- These tests verify that all expected constants exist and have values in a
-- sane range. They act as a regression guard — if a constant is accidentally
-- deleted or set to zero, the test will catch it.

local GameConfig = require("../src/shared/GameConfig")

-- ─── Assertion helper ────────────────────────────────────────────────────────

local passed = 0
local failed = 0

local function expect(name: string, condition: boolean, msg: string?)
	if condition then
		print("  PASS  " .. name)
		passed += 1
	else
		print("  FAIL  " .. name .. (msg and (" — " .. msg) or ""))
		failed += 1
	end
end

-- ─── Tests ───────────────────────────────────────────────────────────────────

print("\n── MAP_BOUNDS ──")
local b = GameConfig.MAP_BOUNDS
expect("MAP_BOUNDS exists", type(b) == "table")
expect("MinX < MaxX", b.MinX < b.MaxX)
expect("MinZ < MaxZ", b.MinZ < b.MaxZ)
expect("map has meaningful size (X range > 1000 studs)", b.MaxX - b.MinX > 1000)
expect("map has meaningful size (Z range > 1000 studs)", b.MaxZ - b.MinZ > 1000)

print("\n── Player settings ──")
expect("MAX_PLAYERS exists and positive", (GameConfig.MAX_PLAYERS or 0) > 0)
expect("MIN_PLAYERS exists and positive", (GameConfig.MIN_PLAYERS or 0) > 0)
expect("MIN_PLAYERS <= MAX_PLAYERS", GameConfig.MIN_PLAYERS <= GameConfig.MAX_PLAYERS)
expect("TEAMS is a table", type(GameConfig.TEAMS) == "table")
expect("TEAMS has at least 1 entry", #GameConfig.TEAMS >= 1)

print("\n── Phase durations ──")
expect("LOBBY_COUNTDOWN is positive", (GameConfig.LOBBY_COUNTDOWN or 0) > 0)
expect("DEPLOY_DURATION is positive", (GameConfig.DEPLOY_DURATION or 0) > 0)
expect("SAILING_DURATION is positive", (GameConfig.SAILING_DURATION or 0) > 0)
expect("COMBAT_DURATION is positive", (GameConfig.COMBAT_DURATION or 0) > 0)
expect("END_SCREEN_DURATION is positive", (GameConfig.END_SCREEN_DURATION or 0) > 0)
-- Combat should be the longest active phase
expect("COMBAT_DURATION > SAILING_DURATION", GameConfig.COMBAT_DURATION > GameConfig.SAILING_DURATION)
expect("COMBAT_DURATION > DEPLOY_DURATION", GameConfig.COMBAT_DURATION > GameConfig.DEPLOY_DURATION)

print("\n── Respawn ──")
expect("RESPAWN_DELAY exists and positive", (GameConfig.RESPAWN_DELAY or 0) > 0)
expect("RESPAWN_DELAY is reasonable (< 60s)", GameConfig.RESPAWN_DELAY < 60)

print("\n── Scoring ──")
expect("SCORE_PER_ZONE_PER_SECOND is positive", (GameConfig.SCORE_PER_ZONE_PER_SECOND or 0) > 0)
expect("VICTORY_SCORE is positive", (GameConfig.VICTORY_SCORE or 0) > 0)
expect("ZONE_CAPTURE_WIN is boolean", type(GameConfig.ZONE_CAPTURE_WIN) == "boolean")

print("\n── Physics ──")
expect("PHYSICS_TICK exists and positive", (GameConfig.PHYSICS_TICK or 0) > 0)
expect("PHYSICS_TICK is a reasonable rate (<= 1/10 for >= 10 Hz)", GameConfig.PHYSICS_TICK <= 0.1)

print("\n── Hazard config ──")
expect("STORM_SPAWN_INTERVAL is positive", (GameConfig.STORM_SPAWN_INTERVAL or 0) > 0)
expect("STORM_DURATION is positive", (GameConfig.STORM_DURATION or 0) > 0)
expect("STORM_MOVE_SPEED is positive", (GameConfig.STORM_MOVE_SPEED or 0) > 0)
expect("STORM_PUSH_FORCE is positive", (GameConfig.STORM_PUSH_FORCE or 0) > 0)
expect("STORM_DAMAGE_PER_SECOND is positive", (GameConfig.STORM_DAMAGE_PER_SECOND or 0) > 0)

print("\n── Iceberg damage tiers ──")
expect("ICEBERG_SMALL_DAMAGE is positive", (GameConfig.ICEBERG_SMALL_DAMAGE or 0) > 0)
expect("ICEBERG_MEDIUM_DAMAGE > ICEBERG_SMALL_DAMAGE", GameConfig.ICEBERG_MEDIUM_DAMAGE > GameConfig.ICEBERG_SMALL_DAMAGE)
expect("ICEBERG_LARGE_DAMAGE > ICEBERG_MEDIUM_DAMAGE", GameConfig.ICEBERG_LARGE_DAMAGE > GameConfig.ICEBERG_MEDIUM_DAMAGE)

print("\n── Shallow water ──")
expect("SHALLOW_WATER_Z_THRESHOLD exists", GameConfig.SHALLOW_WATER_Z_THRESHOLD ~= nil)
expect("SHALLOW_WATER_Z_THRESHOLD is within map bounds", GameConfig.SHALLOW_WATER_Z_THRESHOLD <= GameConfig.MAP_BOUNDS.MaxZ)

print("\n── Territory capture rates ──")
expect("CAPTURE_RATE_PER_SHIP is positive", (GameConfig.CAPTURE_RATE_PER_SHIP or 0) > 0)
expect("CAPTURE_DECAY_RATE is positive", (GameConfig.CAPTURE_DECAY_RATE or 0) > 0)
expect("CAPTURE_MAX_PROGRESS is positive", (GameConfig.CAPTURE_MAX_PROGRESS or 0) > 0)
-- Capture rate should be faster than decay so ships can actually capture zones
expect("CAPTURE_RATE_PER_SHIP > CAPTURE_DECAY_RATE", GameConfig.CAPTURE_RATE_PER_SHIP > GameConfig.CAPTURE_DECAY_RATE)

-- ─── Summary ─────────────────────────────────────────────────────────────────

print(string.format("\n%d passed, %d failed", passed, failed))
if failed > 0 then
	process.exit(1)
end