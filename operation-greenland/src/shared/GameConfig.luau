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

-- Round settings
GameConfig.ROUND_DURATION = 600       -- seconds (10 minutes)
GameConfig.RESPAWN_DELAY = 8          -- seconds before ship respawns
GameConfig.COUNTDOWN_DURATION = 10    -- pre-round countdown seconds

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