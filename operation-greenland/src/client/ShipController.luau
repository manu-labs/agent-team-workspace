-- ShipController.luau
-- Client-side ship controller: WASD movement input, mouse aiming, and weapon firing.
-- All positional authority is server-side (ShipSystem #88); this module reads input
-- and fires RemoteEvents — it never moves the ship model directly.

local Players          = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService       = game:GetService("RunService")
local TweenService     = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local LocalPlayer = Players.LocalPlayer
local Mouse       = LocalPlayer:GetMouse()

-- RemoteEvents live in ReplicatedStorage.Remotes (created by ShipSystem #88).
-- WaitForChild is used so this module works even if Remotes load slightly late.
local Remotes     = ReplicatedStorage:WaitForChild("Remotes", 10)
local InputCommand = Remotes:WaitForChild("InputCommand", 10)  -- throttle + rudder each frame-change
local FireWeapon   = Remotes:WaitForChild("FireWeapon", 10)   -- (weaponId, aimDir)
local UseAbility   = Remotes:WaitForChild("UseAbility", 10)   -- (aimDir)

-- ─── State ──────────────────────────────────────────────────────────────────

local shipModel   = nil   -- set via ShipController.setShip() when ship spawns
local throttle    = 0     -- current throttle: -1 (reverse) … 0 … 1 (full ahead)
local rudder      = 0     -- current rudder:   -1 (left)    … 0 … 1 (right)

-- ─── Visual helpers ─────────────────────────────────────────────────────────

-- Tween the ship's roll slightly when turning (purely cosmetic, no physics).
local rollTween = nil
local function updateShipTilt()
	if not shipModel or not shipModel.PrimaryPart then return end
	local targetRollDeg = rudder * 8   -- max ±8° tilt
	local cf = shipModel.PrimaryPart.CFrame
	-- Decompose to keep position + yaw, only adjust roll
	local x, y, z = cf:ToEulerAnglesYXZ()
	local goalCF   = CFrame.new(cf.Position)
		* CFrame.Angles(0, y, 0)                   -- preserve heading
		* CFrame.Angles(0, 0, math.rad(targetRollDeg)) -- apply roll
	if rollTween then rollTween:Cancel() end
	rollTween = TweenService:Create(
		shipModel.PrimaryPart,
		TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{ CFrame = goalCF }
	)
	rollTween:Play()
end

-- Scale wake-particle emission rate with throttle.
local function updateWake()
	if not shipModel then return end
	local wakePart = shipModel:FindFirstChild("WakePart", true)
	if not wakePart then return end
	for _, emitter in ipairs(wakePart:GetChildren()) do
		if emitter:IsA("ParticleEmitter") then
			emitter.Rate = math.abs(throttle) * 60
		end
	end
end

-- Scale engine sound volume with throttle.
local function updateEngineSound()
	if not shipModel then return end
	local snd = shipModel:FindFirstChild("EngineSound", true)
	if snd and snd:IsA("Sound") then
		snd.Volume = math.abs(throttle) * 0.8 + 0.1
	end
end

-- ─── Crosshair ──────────────────────────────────────────────────────────────

local function setupCrosshair()
	local playerGui  = LocalPlayer:WaitForChild("PlayerGui")
	local gui        = Instance.new("ScreenGui")
	gui.Name         = "CrosshairGui"
	gui.ResetOnSpawn = false
	gui.DisplayOrder = 10
	gui.IgnoreGuiInset = true
	gui.Parent       = playerGui

	local cross             = Instance.new("Frame", gui)
	cross.Name              = "Crosshair"
	cross.Size              = UDim2.fromOffset(22, 22)
	cross.AnchorPoint       = Vector2.new(0.5, 0.5)
	cross.BackgroundTransparency = 1

	-- Horizontal bar
	local h               = Instance.new("Frame", cross)
	h.Size                = UDim2.new(1, 0, 0, 2)
	h.Position            = UDim2.fromScale(0, 0.5)
	h.AnchorPoint         = Vector2.new(0, 0.5)
	h.BackgroundColor3    = Color3.new(1, 1, 1)
	h.BorderSizePixel     = 0

	-- Vertical bar
	local v               = Instance.new("Frame", cross)
	v.Size                = UDim2.new(0, 2, 1, 0)
	v.Position            = UDim2.fromScale(0.5, 0)
	v.AnchorPoint         = Vector2.new(0.5, 0)
	v.BackgroundColor3    = Color3.new(1, 1, 1)
	v.BorderSizePixel     = 0

	-- Track mouse each render frame
	RunService.RenderStepped:Connect(function()
		cross.Position = UDim2.fromOffset(Mouse.X, Mouse.Y)
	end)
end

-- ─── Input loop ─────────────────────────────────────────────────────────────

local KEYS = {
	forward = Enum.KeyCode.W,
	reverse = Enum.KeyCode.S,
	left    = Enum.KeyCode.A,
	right   = Enum.KeyCode.D,
}

-- Called every Heartbeat: poll keyboard, send server update on change.
local function onHeartbeat(_dt)
	if not shipModel then return end

	local prevThrottle = throttle
	local prevRudder   = rudder

	throttle = 0
	rudder   = 0
	if UserInputService:IsKeyDown(KEYS.forward) then throttle =  1 end
	if UserInputService:IsKeyDown(KEYS.reverse) then throttle = -1 end
	if UserInputService:IsKeyDown(KEYS.left)    then rudder   = -1 end
	if UserInputService:IsKeyDown(KEYS.right)   then rudder   =  1 end

	-- Only fire when input actually changed to reduce unnecessary RemoteEvent traffic
	if throttle ~= prevThrottle or rudder ~= prevRudder then
		InputCommand:FireServer({ throttle = throttle, rudder = rudder })
		updateShipTilt()
	end

	updateWake()
	updateEngineSound()
end

-- ─── Weapon input ───────────────────────────────────────────────────────────

local function getAimDirection()
	if not shipModel or not shipModel.PrimaryPart then
		return Vector3.new(0, 0, -1)
	end
	local origin = shipModel.PrimaryPart.Position
	local target = Mouse.Hit.Position
	return (target - origin).Unit
end

local function onInputBegan(input, gameProcessed)
	if gameProcessed then return end
	if not shipModel then return end

	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		-- Left click: fire primary weapon
		FireWeapon:FireServer("primary", getAimDirection())

	elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
		-- Right click: use special ability
		UseAbility:FireServer(getAimDirection())
	end
end

-- ─── Public API ─────────────────────────────────────────────────────────────

local ShipController = {}

-- Called by the client bootstrap (or ShipSystem callback) when the local
-- player's ship model is ready.  Must be called before controls become active.
function ShipController.setShip(model)
	shipModel = model
	print("[ShipController] Ship model set:", model.Name)
end

function ShipController.init()
	setupCrosshair()

	RunService.Heartbeat:Connect(onHeartbeat)
	UserInputService.InputBegan:Connect(onInputBegan)

	print("[ShipController] Initialized — WASD + mouse aiming active.")
end

return ShipController