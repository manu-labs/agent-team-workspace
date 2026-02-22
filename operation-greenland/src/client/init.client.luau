-- Client bootstrap LocalScript
-- Rojo maps this directory to StarterPlayer.StarterPlayerScripts.Client.
-- This file uses .client.luau so Rojo creates a LocalScript (runs per-player).
-- All client controllers are sibling ModuleScripts required and initialised here.

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local ShipController  = require(script.ShipController)
-- local CameraController = require(script.CameraController)  -- added in #92

print("[Client] Operation Greenland client starting...")

ShipController.init()

-- When the server spawns our ship, pass the model to each controller
-- so they can reference it.  ShipSystem fires a BindableEvent or sets an
-- attribute on the character; we poll here as a simple fallback.
local function onCharacterAdded(character)
	-- ShipSystem (#88) will parent the ship model to a known location; adjust
	-- this path once server implementation is known.
	local shipModel = character:WaitForChild("ShipModel", 10)
	if shipModel then
		ShipController.setShip(shipModel)
		-- CameraController.setShip(shipModel)  -- uncomment when #92 merges
	end
end

LocalPlayer.CharacterAdded:Connect(onCharacterAdded)
if LocalPlayer.Character then
	onCharacterAdded(LocalPlayer.Character)
end

print("[Client] Operation Greenland client ready.")
