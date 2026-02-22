-- Client bootstrap LocalScript
-- Rojo maps src/client/ to StarterPlayer.StarterPlayerScripts.Client.
-- Requires and initialises all client-side controller ModuleScripts.

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local ShipController = require(script.ShipController)
-- CameraController added in #92

print("[Client] Operation Greenland client starting...")

ShipController.init()

-- When the server spawns the local player's ship, notify each controller.
-- ShipSystem (#88) will confirm the exact parent path; update once known.
local function onCharacterAdded(character)
	local shipModel = character:WaitForChild("ShipModel", 10)
	if shipModel then
		ShipController.setShip(shipModel)
	end
end

LocalPlayer.CharacterAdded:Connect(onCharacterAdded)
if LocalPlayer.Character then
	onCharacterAdded(LocalPlayer.Character)
end

print("[Client] Operation Greenland client ready.")
