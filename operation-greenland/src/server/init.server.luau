-- Server bootstrap Script
-- Rojo maps this directory to ServerScriptService.Server.
-- This file uses .server.luau so Rojo creates a Script instance (auto-runs).
-- All server systems (GameManager, ShipSystem, etc.) are sibling ModuleScripts
-- that this bootstrap requires and initialises.

local RunService = game:GetService("RunService")

print("[Server] Operation Greenland server starting...")

-- Systems will be required here once implemented:
-- local GameManager = require(script.GameManager)
-- GameManager.Init()

-- Main game loop (heartbeat runs ~60 times/sec)
-- RunService.Heartbeat:Connect(function(dt)
--     GameManager.Update(dt)
-- end)

print("[Server] Operation Greenland server ready.")
