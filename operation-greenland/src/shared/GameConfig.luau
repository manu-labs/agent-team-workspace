-- GameConfig.luau
-- Game-wide constants and configuration for Operation Greenland

local GameConfig = {}

-- Map boundaries (in studs)
GameConfig.MAP_BOUNDS = {
	MinX = -5000,
	MaxX = 5000,
	MinZ = -8000,
	MaxZ = 8000,
}

-- Player settings
GameConfig.MAX_PLAYERS = 10

GameConfig.TEAMS = {
	{ Name = "US Fleet", Color = "Bright blue" },
}

-- Phase durations (seconds) — mirrors GameManager constants, centralised here
-- so both server systems and UI can reference the same values.
GameConfig.LOBBY_COUNTDOWN   = 30   -- pre-start countdown in Lobby phase
GameConfig.MIN_PLAYERS       = 1    -- minimum players to start the countdown
GameConfig.DEPLOY_DURATION   = 30   -- ship selection phase (Deploying)
GameConfig.SAILING_DURATION  = 60   -- ocean crossing phase (Sailing)
GameConfig.COMBAT_DURATION   = 300  -- main combat phase (5 minutes)
GameConfig.END_SCREEN_DURATION = 10 -- Victory/Defeat display before returning to Lobby

-- Respawn
GameConfig.RESPAWN_DELAY = 8        -- seconds before a destroyed ship respawns

-- Scoring
GameConfig.SCORE_PER_ZONE_PER_SECOND = 1   -- points per held zone per second
GameConfig.VICTORY_SCORE = 1000            -- score needed to win by points
GameConfig.ZONE_CAPTURE_WIN = true         -- also win by capturing all zones

-- Physics
GameConfig.PHYSICS_TICK = 1 / 20      -- 20 Hz server physics update rate

-- Hazard timing
GameConfig.STORM_SPAWN_INTERVAL = 90  -- seconds between new storms spawning
GameConfig.STORM_DURATION = 60        -- seconds a storm persists
GameConfig.STORM_MOVE_SPEED = 30      -- studs/second storm travel speed
GameConfig.STORM_PUSH_FORCE = 20      -- max random push force on ships in studs/s
GameConfig.STORM_DAMAGE_PER_SECOND = 5 -- HP per second while inside storm

-- Iceberg settings
GameConfig.ICEBERG_SMALL_DAMAGE = 50
GameConfig.ICEBERG_MEDIUM_DAMAGE = 120
GameConfig.ICEBERG_LARGE_DAMAGE = 250

-- Shallow water zone (near Greenland coast, Z > this value)
GameConfig.SHALLOW_WATER_Z_THRESHOLD = 6500

-- Territory capture rates (in progress points per second)
GameConfig.CAPTURE_RATE_PER_SHIP = 10   -- each ship contributes this per second
GameConfig.CAPTURE_DECAY_RATE = 5       -- decay per second when no ships present
GameConfig.CAPTURE_MAX_PROGRESS = 100

return GameConfig