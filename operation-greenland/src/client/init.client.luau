-- Client bootstrap LocalScript
-- Rojo maps this directory to StarterPlayer.StarterPlayerScripts.Client.
-- This file uses .client.luau so Rojo creates a LocalScript (runs per-player).
-- All client controllers are sibling ModuleScripts required and initialised here.

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local ShipController   = require(script.ShipController)
local CameraController = require(script.CameraController)

print("[Client] Operation Greenland client starting...")

ShipController.init()
CameraController.init()

-- When the server spawns our ship, pass the model to each controller.
-- ShipSystem (#88) parents the ship model to a known location; adjust this
-- path once the server implementation confirms the convention.
local function onCharacterAdded(character)
	local shipModel = character:WaitForChild("ShipModel", 10)
	if shipModel then
		ShipController.setShip(shipModel)
		CameraController.setShip(shipModel)
	end
end

LocalPlayer.CharacterAdded:Connect(onCharacterAdded)
if LocalPlayer.Character then
	onCharacterAdded(LocalPlayer.Character)
end

print("[Client] Operation Greenland client ready.")
