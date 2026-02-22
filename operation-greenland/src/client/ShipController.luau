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

-- RemoteEvents are created server-side by GameManager (#87) in ReplicatedStorage.Remotes.
-- WaitForChild is used so this module works even if Remotes load slightly late.
-- Returns nil on timeout — all usages below are nil-guarded.
local Remotes       = ReplicatedStorage:WaitForChild("Remotes", 10)
local ShipMoveInput = Remotes and Remotes:WaitForChild("ShipMoveInput", 10)  -- {forward:number, turn:number}
local FireWeapon    = Remotes and Remotes:WaitForChild("FireWeapon", 10)     -- (weaponId, origin, direction)
local UseAbility    = Remotes and Remotes:FindFirstChild("UseAbility")        -- added by CombatSystem (#89); FindFirstChild to be safe if not yet created

-- ─── State ──────────────────────────────────────────────────────────────────

local shipModel  = nil   -- set via ShipController.setShip() when ship spawns
local throttle   = 0     -- -1 (reverse) … 0 … 1 (full ahead)
local rudder     = 0     -- -1 (left)    … 0 … 1 (right)

-- ─── Cosmetic tilt ───────────────────────────────────────────────────────────
-- We tilt a dedicated cosmetic child Part rather than PrimaryPart to avoid
-- fighting the server's CFrame replication on PrimaryPart.

local function getTiltPart()
	if not shipModel then return nil end
	-- If ShipSystem provides a TiltPart child, use it; otherwise no tilt.
	return shipModel:FindFirstChild("TiltPart", true)
end

local rollTween = nil
local function updateShipTilt()
	local tiltPart = getTiltPart()
	if not tiltPart then return end

	local targetRollDeg = rudder * 8   -- max ±8° visual tilt
	local cf = tiltPart.CFrame
	-- Preserve position and yaw; only adjust roll
	local _, y, _ = cf:ToEulerAnglesYXZ()
	local goalCF = CFrame.new(cf.Position)
		* CFrame.Angles(0, y, 0)
		* CFrame.Angles(0, 0, math.rad(targetRollDeg))

	if rollTween then rollTween:Cancel() end
	rollTween = TweenService:Create(
		tiltPart,
		TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{ CFrame = goalCF }
	)
	rollTween:Play()
end

-- ─── Wake particles & engine sound ──────────────────────────────────────────

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

local function updateEngineSound()
	if not shipModel then return end
	local snd = shipModel:FindFirstChild("EngineSound", true)
	if snd and snd:IsA("Sound") then
		snd.Volume = math.abs(throttle) * 0.8 + 0.1
	end
end

-- ─── Crosshair ───────────────────────────────────────────────────────────────

local function setupCrosshair()
	local playerGui = LocalPlayer:WaitForChild("PlayerGui")

	local gui = Instance.new("ScreenGui")
	gui.Name           = "CrosshairGui"
	gui.ResetOnSpawn   = false
	gui.DisplayOrder   = 10
	gui.IgnoreGuiInset = true
	gui.Parent         = playerGui

	local cross = Instance.new("Frame")
	cross.Name              = "Crosshair"
	cross.Size              = UDim2.fromOffset(22, 22)
	cross.AnchorPoint       = Vector2.new(0.5, 0.5)
	cross.BackgroundTransparency = 1
	cross.Parent            = gui

	local h = Instance.new("Frame")
	h.Size             = UDim2.new(1, 0, 0, 2)
	h.Position         = UDim2.fromScale(0, 0.5)
	h.AnchorPoint      = Vector2.new(0, 0.5)
	h.BackgroundColor3 = Color3.new(1, 1, 1)
	h.BorderSizePixel  = 0
	h.Parent           = cross

	local v = Instance.new("Frame")
	v.Size             = UDim2.new(0, 2, 1, 0)
	v.Position         = UDim2.fromScale(0.5, 0)
	v.AnchorPoint      = Vector2.new(0.5, 0)
	v.BackgroundColor3 = Color3.new(1, 1, 1)
	v.BorderSizePixel  = 0
	v.Parent           = cross

	RunService.RenderStepped:Connect(function()
		cross.Position = UDim2.fromOffset(Mouse.X, Mouse.Y)
	end)
end

-- ─── Input loop ──────────────────────────────────────────────────────────────

local KEYS = {
	forward = Enum.KeyCode.W,
	reverse = Enum.KeyCode.S,
	left    = Enum.KeyCode.A,
	right   = Enum.KeyCode.D,
}

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

	if throttle ~= prevThrottle or rudder ~= prevRudder then
		-- Nil-guard: ShipMoveInput may not exist if Remotes haven't loaded yet
		if ShipMoveInput then
			ShipMoveInput:FireServer({ forward = throttle, turn = rudder })
		end
		updateShipTilt()
	end

	updateWake()
	updateEngineSound()
end

-- ─── Weapon input ────────────────────────────────────────────────────────────

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
		if FireWeapon then
			FireWeapon:FireServer("primary", shipModel.PrimaryPart.Position, getAimDirection())
		end

	elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
		-- UseAbility may be added later by CombatSystem (#89)
		if UseAbility then
			UseAbility:FireServer(getAimDirection())
		else
			-- Try a fresh lookup in case it was added after init
			UseAbility = Remotes and Remotes:FindFirstChild("UseAbility")
			if UseAbility then
				UseAbility:FireServer(getAimDirection())
			end
		end
	end
end

-- ─── Public API ──────────────────────────────────────────────────────────────

local ShipController = {}

-- Called by the client bootstrap when the local player's ship model is ready.
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