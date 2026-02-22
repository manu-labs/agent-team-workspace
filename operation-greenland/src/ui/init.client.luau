-- UI bootstrap LocalScript
-- Rojo maps this directory to StarterGui.UI.
-- This file uses .client.luau so Rojo creates a LocalScript (runs per-player).
-- Each UI screen/widget is a sibling ModuleScript required and initialised here.

local ShipSelectionScreen = require(script.ShipSelectionScreen)
local HUD                 = require(script.HUD)
local Minimap             = require(script.Minimap)
local Scoreboard          = require(script.Scoreboard)
local VictoryDefeatScreen = require(script.VictoryDefeatScreen)

print("[UI] Operation Greenland UI starting...")

ShipSelectionScreen.init()
HUD.init()
Minimap.init()
Scoreboard.init()
VictoryDefeatScreen.init()

print("[UI] Operation Greenland UI ready.")
