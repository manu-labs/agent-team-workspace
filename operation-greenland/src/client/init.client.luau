-- Client bootstrap LocalScript
-- Rojo maps src/client/ to StarterPlayer.StarterPlayerScripts.Client.
-- Requires and initialises all client-side controller ModuleScripts.

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local ShipController   = require(script.ShipController)
local CameraController = require(script.CameraController)

print("[Client] Operation Greenland client starting...")

ShipController.init()
CameraController.init()

-- When the server spawns the local player's ship, notify each controller.
-- ShipSystem (#88) confirms the exact parent path; update this once known.
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
