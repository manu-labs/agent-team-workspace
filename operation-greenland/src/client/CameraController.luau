-- CameraController.luau
-- Client-side camera system for Operation Greenland.
-- Provides a smooth top-down/isometric follow camera with zoom, overview mode,
-- and procedural shake effects.  All camera control is purely cosmetic and
-- client-authoritative — it does not affect gameplay state.

local Players          = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService       = game:GetService("RunService")
local TweenService     = game:GetService("TweenService")

local Camera      = workspace.CurrentCamera
local LocalPlayer = Players.LocalPlayer

-- ─── Configuration ──────────────────────────────────────────────────────────

local CONFIG = {
	-- Default follow-camera
	followHeightDefault = 50,    -- studs above ship (baseline zoom)
	followBehindScale   = 0.6,   -- behind-distance = height * this factor
	lerpSpeed           = 7,     -- position lerp factor (higher = snappier)

	-- Zoom limits (scroll wheel)
	zoomMin = 30,
	zoomMax = 100,
	zoomStep = 5,                -- studs per scroll tick

	-- Overview mode (Tab hold)
	overviewHeight = 250,        -- studs above ship in overview

	-- Camera shake
	shakeDecay = 6,              -- magnitude units lost per second
	shakePosScale = 3,           -- max positional shake offset (studs)
	shakeVertScale = 1.5,        -- max vertical shake offset (studs)
}

-- ─── State ──────────────────────────────────────────────────────────────────

local shipModel      = nil    -- reference to local player's ship model
local currentZoom    = CONFIG.followHeightDefault
local overviewActive = false
local shakeMag       = 0      -- current shake magnitude [0, 1]

-- ─── Public API ─────────────────────────────────────────────────────────────

local CameraController = {}

-- Called by the client bootstrap when the local player's ship model is ready.
function CameraController.setShip(model)
	shipModel = model
	print("[CameraController] Ship model set:", model.Name)
end

-- Trigger a camera shake.
--   magnitude : 0..1  (0.3 = weapon fire, 0.7 = heavy hit, 1.0 = max)
function CameraController.shake(magnitude)
	shakeMag = math.clamp(shakeMag + magnitude, 0, 1)
end

-- ─── Input handlers ─────────────────────────────────────────────────────────

local function onInputBegan(input, gameProcessed)
	if gameProcessed then return end
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
	if gameProcessed then return end
	if input.UserInputType == Enum.UserInputType.MouseWheel then
		-- Scroll up (positive Z) zooms in (decreases height)
		local delta = input.Position.Z
		currentZoom = math.clamp(currentZoom - delta * CONFIG.zoomStep, CONFIG.zoomMin, CONFIG.zoomMax)
	end
end

-- ─── Per-frame update ───────────────────────────────────────────────────────

local function onRenderStepped(dt)
	if not shipModel or not shipModel.PrimaryPart then
		-- Ship not yet spawned; leave camera as-is
		return
	end

	Camera.CameraType = Enum.CameraType.Scriptable

	local primaryPart = shipModel.PrimaryPart
	local shipPos     = primaryPart.Position

	-- Extract ship yaw so the camera rotates with the ship heading
	-- (ignore pitch and roll from the visual tilt)
	local shipLook = -primaryPart.CFrame.LookVector
	local shipYaw  = math.atan2(shipLook.X, shipLook.Z)
	local yawCF    = CFrame.Angles(0, shipYaw, 0)

	-- ── Target position ────────────────────────────────────────────────────
	local targetPos
	if overviewActive then
		-- Pull straight up for a strategic overhead view
		targetPos = shipPos + Vector3.new(0, CONFIG.overviewHeight, 0)
	else
		-- Offset in ship-local space: above and behind, rotated to ship heading
		local behindDist = currentZoom * CONFIG.followBehindScale
		local localOffset = Vector3.new(0, currentZoom, behindDist)
		local worldOffset = yawCF:VectorToWorldSpace(localOffset)
		targetPos = shipPos + worldOffset
	end

	-- ── Shake offset ───────────────────────────────────────────────────────
	local shakeOffset = Vector3.zero
	if shakeMag > 0.001 then
		local rand = math.random  -- local alias for slight perf gain
		shakeOffset = Vector3.new(
			(rand() - 0.5) * 2 * shakeMag * CONFIG.shakePosScale,
			(rand() - 0.5) * 2 * shakeMag * CONFIG.shakeVertScale,
			(rand() - 0.5) * 2 * shakeMag * CONFIG.shakePosScale
		)
		shakeMag = math.max(0, shakeMag - CONFIG.shakeDecay * dt)
	end

	-- ── Lerp to target ─────────────────────────────────────────────────────
	local currentPos = Camera.CFrame.Position
	local alpha      = math.min(1, CONFIG.lerpSpeed * dt)
	local newPos     = currentPos:Lerp(targetPos + shakeOffset, alpha)

	-- Always look at the ship's position regardless of mode or shake
	Camera.CFrame = CFrame.lookAt(newPos, shipPos)
end

-- ─── Ship destruction / respawn ─────────────────────────────────────────────
-- When the ship is destroyed the camera stays at its last position naturally
-- because shipModel will be set to nil (or the PrimaryPart removed), causing
-- onRenderStepped to early-return.  setShip() is called again on respawn.

-- ─── Initialise ─────────────────────────────────────────────────────────────

function CameraController.init()
	Camera.CameraType = Enum.CameraType.Scriptable

	UserInputService.InputBegan:Connect(onInputBegan)
	UserInputService.InputEnded:Connect(onInputEnded)
	UserInputService.InputChanged:Connect(onInputChanged)

	RunService.RenderStepped:Connect(onRenderStepped)

	print("[CameraController] Initialized — follow-cam, zoom, overview, shake active.")
end

return CameraController