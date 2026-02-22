-- Types.luau
-- Shared Luau type definitions used across server and client modules.
-- This module exports no runtime values — import it only for type-checking.

-- 2D position/velocity on the XZ plane (Y is ignored for naval movement)
export type Vector2D = {
	X: number,
	Z: number,
}

-- Overall game phase and round tracking.
-- Phase values match GameManager's state machine exactly.
export type GameState = {
	Phase: string,         -- "Lobby" | "Deploying" | "Sailing" | "Combat" | "Victory" | "Defeat"
	TimeRemaining: number, -- seconds left in the current phase
	Score: number,         -- current US Fleet score
	WinnerTeam: string?,   -- set when Phase == "Victory" or "Defeat"
}

-- Live state of a ship entity on the server
export type ShipData = {
	ShipId: string,
	OwnerId: number,           -- Player.UserId
	ShipType: string,          -- matches ShipConfig.ShipType constants
	Position: Vector3,
	Orientation: number,       -- Y-axis rotation in degrees
	Velocity: Vector2D,        -- current movement vector (studs/s)
	Health: number,
	MaxHealth: number,
	IsAlive: boolean,
	InShallowWater: boolean,
	InStorm: boolean,
}

-- Per-player tracking data
export type PlayerData = {
	UserId: number,
	DisplayName: string,
	ShipType: string,
	ShipId: string?,           -- nil if not yet spawned or destroyed
	IsAlive: boolean,
	RespawnTimer: number,      -- seconds until next spawn (0 if alive)
	KillCount: number,
}

-- A capturable zone on the Greenland coast
export type TerritoryZone = {
	ZoneId: string,
	DisplayName: string,
	Position: Vector3,         -- center of the zone
	Radius: number,            -- capture radius in studs
	Owner: string,             -- "Neutral" | "USFleet"
	CaptureProgress: number,   -- 0–100
	Contested: boolean,        -- true when NPC defense is actively resisting
}

-- An in-flight projectile (main gun or special weapon)
export type Projectile = {
	ProjectileId: string,
	OwnerId: number,           -- Player.UserId who fired
	ShipType: string,
	WeaponType: string,        -- "Main" | "Special"
	Position: Vector3,
	Direction: Vector3,        -- unit vector
	Speed: number,             -- studs/second
	Damage: number,
	SpawnTime: number,         -- tick() at time of creation
	Range: number,             -- max travel distance in studs
}

-- An environmental hazard (iceberg, storm, or shallow water region)
export type HazardData = {
	HazardId: string,
	HazardType: string,        -- "Iceberg" | "Storm" | "ShallowWater"
	Position: Vector3,
	Radius: number,            -- effect/collision radius in studs
	-- Storm-specific (nil for non-storms)
	Velocity: Vector2D?,
	DamagePerSecond: number?,
	-- Iceberg-specific (nil for non-icebergs)
	CollisionDamage: number?,
	IcebergSize: string?,      -- "Small" | "Medium" | "Large"
}

return {}