-- UI bootstrap LocalScript
-- Rojo maps src/ui/ to StarterGui.UI (LocalScript per-player).
-- All UI modules are sibling ModuleScripts required and initialised here.

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
