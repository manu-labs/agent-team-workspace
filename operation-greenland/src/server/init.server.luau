-- Server bootstrap Script
-- Rojo maps this directory to ServerScriptService.Server.
-- This file uses .server.luau so Rojo creates a Script instance (auto-runs).
-- All server systems are sibling ModuleScripts that this bootstrap requires
-- and initialises.

local RunService = game:GetService("RunService")
local Players = game:GetService("Players")

print("[Server] Operation Greenland server starting...")

-- ─── Require systems ──────────────────────────────────────────────────────────

local GameManager = require(script.GameManager)
local ShipSystem = require(script.ShipSystem)
local CombatSystem = require(script.CombatSystem)
local TerritorySystem = require(script.TerritorySystem)
local HazardSystem = require(script.HazardSystem)

-- ─── Initialise systems ──────────────────────────────────────────────────────
-- Order matters: GameManager creates remotes, then each system receives them.

GameManager.Init()
local remotes = GameManager.GetRemotes()

-- ShipSystem: manages spawning, movement physics, health, replication.
-- onRespawnReady callback re-spawns the player's ship after the respawn delay.
ShipSystem.init(remotes, function(userId)
	local player = Players:GetPlayerByUserId(userId)
	if player then
		local pData = GameManager.GetPlayerData(player)
		if pData and pData.shipType then
			ShipSystem.spawnShip(player, pData.shipType)
		end
	end
end)

-- CombatSystem: weapon firing, projectiles, hit detection, coastal defenses.
CombatSystem.init(remotes, ShipSystem, GameManager)

-- TerritorySystem: capture zones, scoring, win condition.
TerritorySystem.init(
	remotes,
	function(reason) GameManager.TriggerVictory() end,
	function(userId)
		local player = Players:GetPlayerByUserId(userId)
		if player then GameManager.AddCapture(player) end
	end
)

-- HazardSystem: icebergs, storms, shallow water.
HazardSystem.init(remotes, ShipSystem)

-- ─── Broadcast throttles ─────────────────────────────────────────────────────

local territoryBroadcastAccum = 0
local TERRITORY_BROADCAST_INTERVAL = 0.5  -- broadcast every 0.5s (~10 ticks at 20Hz)
local hazardBroadcastAccum = 0
local HAZARD_BROADCAST_INTERVAL = 0.25    -- broadcast every 0.25s (~5 ticks at 20Hz)

-- ─── Main game loop ──────────────────────────────────────────────────────────
-- Heartbeat fires ~60 times/sec, after physics.

RunService.Heartbeat:Connect(function(dt: number)
	GameManager.Update(dt)
	ShipSystem.tick(dt)
	CombatSystem.tick(dt)

	-- Build ship positions list for TerritorySystem
	local shipPositions = {}
	for _, ship in pairs(ShipSystem.getAllShips()) do
		if ship.IsAlive then
			table.insert(shipPositions, { Position = ship.Position, OwnerId = ship.OwnerId })
		end
	end
	TerritorySystem.tick(dt, shipPositions)

	-- HazardSystem needs the full ship map and player list
	HazardSystem.tick(dt, ShipSystem.getAllShips(), Players:GetPlayers())

	-- Periodic broadcasts
	territoryBroadcastAccum += dt
	if territoryBroadcastAccum >= TERRITORY_BROADCAST_INTERVAL then
		territoryBroadcastAccum = 0
		TerritorySystem.broadcastState()
	end

	hazardBroadcastAccum += dt
	if hazardBroadcastAccum >= HAZARD_BROADCAST_INTERVAL then
		hazardBroadcastAccum = 0
		HazardSystem.broadcastState()
	end

	-- ShipSystem broadcasts its own state internally via tick()
end)

print("[Server] Operation Greenland server ready.")
