-- Server bootstrap Script
-- Rojo maps this directory to ServerScriptService.Server.
-- This file uses .server.luau so Rojo creates a Script instance (auto-runs).
-- All server systems are sibling ModuleScripts that this bootstrap requires
-- and initialises.

local RunService = game:GetService("RunService")

print("[Server] Operation Greenland server starting...")

-- Require systems
local GameManager = require(script.GameManager)

-- Initialise systems (order matters — later systems may depend on earlier ones)
GameManager.Init()

-- Future systems will be initialised here:
-- local ShipSystem = require(script.ShipSystem)
-- ShipSystem.Init(GameManager)
-- local CombatSystem = require(script.CombatSystem)
-- CombatSystem.Init(GameManager, ShipSystem)
-- local TerritorySystem = require(script.TerritorySystem)
-- TerritorySystem.Init(GameManager)
-- local HazardSystem = require(script.HazardSystem)
-- HazardSystem.Init(GameManager, ShipSystem)

-- Main game loop (Heartbeat fires ~60 times/sec, after physics)
RunService.Heartbeat:Connect(function(dt: number)
	GameManager.Update(dt)
	-- ShipSystem.Update(dt)
	-- CombatSystem.Update(dt)
	-- TerritorySystem.Update(dt)
	-- HazardSystem.Update(dt)
end)

print("[Server] Operation Greenland server ready.")

