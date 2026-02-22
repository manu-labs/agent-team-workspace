-- Client bootstrap LocalScript
-- Rojo maps src/client/ to StarterPlayer.StarterPlayerScripts.Client.
-- Requires and initialises all client-side controller ModuleScripts.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local LocalPlayer = Players.LocalPlayer

local ShipController = require(script.ShipController)
local CameraController = require(script.CameraController)

print("[Client] Operation Greenland client starting...")

ShipController.init()
CameraController.init()

-- Wire CameraController to the local player's ship.
-- ShipController clones the workspace model on ShipSpawned (for all ships).
-- We listen here too to hand the local model to CameraController.
-- Both listeners fire in the same tick; ShipController registers first (inits first),
-- so the model already exists in workspace when this callback runs.
local Remotes = ReplicatedStorage:WaitForChild("Remotes", 10)
local ShipSpawnedRE = Remotes and Remotes:WaitForChild("ShipSpawned", 10)
local ShipDespawnedRE = Remotes and Remotes:WaitForChild("ShipDespawned", 10)
local GameStateChangedRE = Remotes and Remotes:WaitForChild("GameStateChanged", 10)

if ShipSpawnedRE then
	ShipSpawnedRE.OnClientEvent:Connect(function(data)
		if type(data) ~= "table" then
			return
		end
		if data.OwnerId ~= LocalPlayer.UserId then
			return
		end

		-- ShipController already parented the model to workspace as "Ship_<ShipId>"
		local model = workspace:FindFirstChild("Ship_" .. data.ShipId)
		if model then
			CameraController.setShip(model)
		end
	end)
end

if ShipDespawnedRE then
	ShipDespawnedRE.OnClientEvent:Connect(function(data)
		if type(data) ~= "table" then
			return
		end
		-- Notify camera that the local ship is gone so it stops tracking
		-- (CameraController gracefully handles a nil/destroyed model via PrimaryPart guard)
	end)
end

-- When the round ends and the game returns to Lobby, restore the dock camera view.
if GameStateChangedRE then
	GameStateChangedRE.OnClientEvent:Connect(function(newState, _oldState)
		if newState == "Lobby" then
			CameraController.setLobbyCamera()
		end
	end)
end

print("[Client] Operation Greenland client ready.")
