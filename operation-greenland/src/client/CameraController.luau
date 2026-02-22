-- CameraController.luau
-- Client-side camera system for Operation Greenland.
-- Smooth top-down/isometric follow camera with zoom, overview mode (Tab hold),
-- and procedural shake effects.  Purely cosmetic — no gameplay state changes.
-- During Lobby (no ship assigned), shows a fixed elevated dock view.

local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Camera = workspace.CurrentCamera

-- ─── Configuration ───────────────────────────────────────────────────────────

local CONFIG = {
	followHeightDefault = 50, -- studs above ship (baseline zoom)
	followBehindScale = 0.6, -- behind-distance = height * this factor
	lerpSpeed = 7, -- position lerp factor (higher = snappier)
	zoomMin = 30,
	zoomMax = 100,
	zoomStep = 5, -- studs per scroll tick
	overviewHeight = 250, -- studs above ship in overview mode
	shakeDecay = 6, -- shake magnitude lost per second
	shakePosScale = 3, -- max positional shake offset (studs)
	shakeVertScale = 1.5, -- max vertical shake offset (studs)
}

local LOBBY_CAM_POS = Vector3.new(0, 80, -7700)
local LOBBY_CAM_LOOK = Vector3.new(0, 0, -7400)

-- ─── State ───────────────────────────────────────────────────────────────────

local shipModel = nil
local currentZoom = CONFIG.followHeightDefault
local overviewActive = false
local shakeMag = 0

-- ─── Lobby view ──────────────────────────────────────────────────────────────

local function setLobbyView()
	Camera.CameraType = Enum.CameraType.Scriptable
	Camera.CFrame = CFrame.lookAt(LOBBY_CAM_POS, LOBBY_CAM_LOOK)
end

-- ─── Public API ──────────────────────────────────────────────────────────────

local CameraController = {}

function CameraController.setShip(model)
	shipModel = model
	print("[CameraController] Ship model set:", model.Name)
end

-- Called when round ends and game returns to Lobby — clears ship and restores dock view.
function CameraController.clearShip()
	shipModel = nil
	setLobbyView()
end

-- Trigger camera shake.  magnitude: 0..1 (0.3 = weapon fire, 0.7+ = heavy hit)
function CameraController.shake(magnitude)
	shakeMag = math.clamp(shakeMag + magnitude, 0, 1)
end

-- ─── Input handlers ──────────────────────────────────────────────────────────

local function onInputBegan(input, gameProcessed)
	if gameProcessed then
		return
	end
	if input.KeyCode == Enum.KeyCode.Tab then
		overviewActive = true
	end
end

local function onInputEnded(input, _gameProcessed)
	if input.KeyCode == Enum.KeyCode.Tab then
		overviewActive = false
	end
end

local function onInputChanged(input, gameProcessed)
	if gameProcessed then
		return
	end
	if input.UserInputType == Enum.UserInputType.MouseWheel then
		-- Positive Z = scroll up = zoom in (decrease height)
		currentZoom = math.clamp(currentZoom - input.Position.Z * CONFIG.zoomStep, CONFIG.zoomMin, CONFIG.zoomMax)
	end
end

-- ─── Per-frame update ────────────────────────────────────────────────────────

local function onRenderStepped(dt)
	if not shipModel or not shipModel.PrimaryPart then
		return
	end

	Camera.CameraType = Enum.CameraType.Scriptable

	local primaryPart = shipModel.PrimaryPart
	local shipPos = primaryPart.Position

	-- Ship yaw only — ignore pitch/roll from cosmetic tilt
	local shipLook = -primaryPart.CFrame.LookVector
	local shipYaw = math.atan2(shipLook.X, shipLook.Z)
	local yawCF = CFrame.Angles(0, shipYaw, 0)

	-- Target camera position
	local targetPos
	if overviewActive then
		targetPos = shipPos + Vector3.new(0, CONFIG.overviewHeight, 0)
	else
		local behindDist = currentZoom * CONFIG.followBehindScale
		local worldOffset = yawCF:VectorToWorldSpace(Vector3.new(0, currentZoom, behindDist))
		targetPos = shipPos + worldOffset
	end

	-- Shake offset
	local shakeOffset = Vector3.zero
	if shakeMag > 0.001 then
		local r = math.random
		shakeOffset = Vector3.new(
			(r() - 0.5) * 2 * shakeMag * CONFIG.shakePosScale,
			(r() - 0.5) * 2 * shakeMag * CONFIG.shakeVertScale,
			(r() - 0.5) * 2 * shakeMag * CONFIG.shakePosScale
		)
		shakeMag = math.max(0, shakeMag - CONFIG.shakeDecay * dt)
	end

	-- Lerp to target, always look at ship
	local alpha = math.min(1, CONFIG.lerpSpeed * dt)
	local newPos = Camera.CFrame.Position:Lerp(targetPos + shakeOffset, alpha)
	Camera.CFrame = CFrame.lookAt(newPos, shipPos)
end

-- ─── Init ────────────────────────────────────────────────────────────────────

function CameraController.init()
	setLobbyView()

	UserInputService.InputBegan:Connect(onInputBegan)
	UserInputService.InputEnded:Connect(onInputEnded)
	UserInputService.InputChanged:Connect(onInputChanged)
	RunService.RenderStepped:Connect(onRenderStepped)

	local Remotes = ReplicatedStorage:WaitForChild("Remotes", 10)
	local GameStateChangedRE = Remotes and Remotes:WaitForChild("GameStateChanged", 10)
	if GameStateChangedRE then
		GameStateChangedRE.OnClientEvent:Connect(function(newState)
			if newState == "Lobby" then
				CameraController.clearShip()
			end
		end)
	end

	print("[CameraController] Initialized — lobby view active, follow-cam/zoom/overview/shake ready.")
end

return CameraController
