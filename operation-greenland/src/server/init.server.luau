-- Server bootstrap Script
-- Rojo maps this directory to ServerScriptService.Server.
-- This file uses .server.luau so Rojo creates a Script instance (auto-runs).
-- All server systems are sibling ModuleScripts that this bootstrap requires
-- and initialises.

local RunService = game:GetService("RunService")
local Players = game:GetService("Players")

-- Disable default humanoid character spawning. Operation Greenland is a
-- ship-based game — players control ships, not Roblox characters. Without
-- this line, Roblox auto-spawns a humanoid that falls to its death on join.
Players.CharacterAutoLoads = false

print("[Server] Operation Greenland server starting...")

-- ─── Build world and ship models (run before system init) ─────────────────────

require(script.ShipModelBuilder).build()
require(script.WorldBuilder).build()

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
TerritorySystem.init(remotes, function(_reason)
	GameManager.TriggerVictory()
end, function(userId)
	local player = Players:GetPlayerByUserId(userId)
	if player then
		GameManager.AddCapture(player)
	end
end)

-- HazardSystem: icebergs, storms, shallow water.
HazardSystem.init(remotes, ShipSystem)

-- ─── Broadcast throttles ─────────────────────────────────────────────────────

local shipBroadcastAccum = 0
local SHIP_BROADCAST_INTERVAL = 0.066 -- ~15 updates/sec for smooth rendering
local minimapBroadcastAccum = 0
local MINIMAP_BROADCAST_INTERVAL = 0.5 -- minimap dots update every 0.5s
local territoryBroadcastAccum = 0
local TERRITORY_BROADCAST_INTERVAL = 0.5 -- zone state every 0.5s
local hazardBroadcastAccum = 0
local HAZARD_BROADCAST_INTERVAL = 0.25 -- storm positions every 0.25s

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

	-- ── Ship state broadcast (~15 Hz) ────────────────────────────────────
	-- Full snapshot for client-side ship rendering (position, orientation,
	-- velocity, health). Fires ShipStateUpdate to all clients.
	shipBroadcastAccum += dt
	if shipBroadcastAccum >= SHIP_BROADCAST_INTERVAL then
		shipBroadcastAccum = 0
		ShipSystem.broadcastState()
	end

	-- ── Minimap broadcast (~2 Hz) ────────────────────────────────────────
	-- Simplified {userId, x, z} list for the minimap UI.
	-- Lower frequency than ShipStateUpdate since minimap dots don't need
	-- frame-perfect positions.
	minimapBroadcastAccum += dt
	if minimapBroadcastAccum >= MINIMAP_BROADCAST_INTERVAL then
		minimapBroadcastAccum = 0
		local minimapShips = {}
		for _, ship in pairs(ShipSystem.getAllShips()) do
			if ship.IsAlive then
				table.insert(minimapShips, {
					userId = ship.OwnerId,
					x = ship.Position.X,
					z = ship.Position.Z,
				})
			end
		end
		remotes["MinimapUpdated"]:FireAllClients(minimapShips)
	end

	-- ── Territory broadcast (~2 Hz) ──────────────────────────────────────
	territoryBroadcastAccum += dt
	if territoryBroadcastAccum >= TERRITORY_BROADCAST_INTERVAL then
		territoryBroadcastAccum = 0
		TerritorySystem.broadcastState()
	end

	-- ── Hazard broadcast (~4 Hz) ─────────────────────────────────────────
	hazardBroadcastAccum += dt
	if hazardBroadcastAccum >= HAZARD_BROADCAST_INTERVAL then
		hazardBroadcastAccum = 0
		HazardSystem.broadcastState()
	end
end)

print("[Server] Operation Greenland server ready.")
