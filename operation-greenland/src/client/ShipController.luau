-- ShipController.luau
-- Client-side ship input and workspace model management.
-- Listens to ShipSpawned/ShipDespawned/ShipStateUpdate RemoteEvents from ShipSystem (#88)
-- to instantiate and position all ship models in workspace.
-- Drives WASD input + weapon firing for the local player's ship only.
-- Server (ShipSystem) remains authoritative for all movement.

local Players           = game:GetService("Players")
local UserInputService  = game:GetService("UserInputService")
local RunService        = game:GetService("RunService")
local TweenService      = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local LocalPlayer = Players.LocalPlayer
local Mouse       = LocalPlayer:GetMouse()

-- ─── Remotes ─────────────────────────────────────────────────────────────────
-- All RemoteEvents created server-side by GameManager in ReplicatedStorage.Remotes.
-- WaitForChild with timeout; all usages below are nil-guarded.

local Remotes         = ReplicatedStorage:WaitForChild("Remotes", 10)
local ShipSpawnedRE   = Remotes and Remotes:WaitForChild("ShipSpawned",    10)
local ShipDespawnedRE = Remotes and Remotes:WaitForChild("ShipDespawned",  10)
local ShipDestroyedRE = Remotes and Remotes:WaitForChild("ShipDestroyed",  10)
local ShipStateRE     = Remotes and Remotes:WaitForChild("ShipStateUpdate",10)
local ShipMoveInput   = Remotes and Remotes:WaitForChild("ShipMoveInput",  10)
local FireWeapon      = Remotes and Remotes:WaitForChild("FireWeapon",     10)
local UseAbility      = Remotes and Remotes:FindFirstChild("UseAbility")   -- added by CombatSystem (#89); graceful lookup

-- ─── State ───────────────────────────────────────────────────────────────────

-- All workspace ship models keyed by ShipId string
local workspaceShips: {[string]: Model} = {}

-- Local player's active ship (set when ShipSpawned fires for our userId)
local localShipId:    string? = nil
local localShipModel: Model?  = nil

-- Input state
local throttle = 0
local rudder   = 0
local inputDisabled = false   -- true while sink animation plays

-- ─── Workspace model helpers ─────────────────────────────────────────────────

local ShipModels = ReplicatedStorage:WaitForChild("ShipModels", 10)

-- Clone the template for modelId, name it "Ship_<shipId>", parent to workspace.
local function spawnWorkspaceModel(modelId: string, shipId: string, position: Vector3, orientationDeg: number): Model?
	if not ShipModels then
		warn("[ShipController] ReplicatedStorage.ShipModels not found")
		return nil
	end
	local template = ShipModels:FindFirstChild(modelId)
	if not template then
		warn("[ShipController] No template in ShipModels for:", modelId)
		return nil
	end

	local model = template:Clone()
	model.Name = "Ship_" .. shipId

	model:PivotTo(CFrame.new(position) * CFrame.Angles(0, math.rad(orientationDeg), 0))

	model.Parent = workspace
	return model
end

-- ─── Cosmetic tilt (TiltPart child, not PrimaryPart) ─────────────────────────
-- We tilt a dedicated cosmetic child rather than PrimaryPart to avoid fighting
-- the server's CFrame replication on PrimaryPart.

local rollTween = nil

local function getTiltPart(): BasePart?
	if not localShipModel then return nil end
	return localShipModel:FindFirstChild("TiltPart", true)
end

local function updateShipTilt()
	local tiltPart = getTiltPart()
	if not tiltPart then return end

	local targetRollDeg = rudder * 8   -- max ±8° visual lean
	local cf = tiltPart.CFrame
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
	if not localShipModel then return end
	local wakePart = localShipModel:FindFirstChild("WakePart", true)
	if not wakePart then return end
	for _, emitter in ipairs(wakePart:GetChildren()) do
		if emitter:IsA("ParticleEmitter") then
			emitter.Rate = math.abs(throttle) * 60
		end
	end
end

local function updateEngineSound()
	if not localShipModel then return end
	local snd = localShipModel:FindFirstChild("EngineSound", true)
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

-- ─── Ship lifecycle ───────────────────────────────────────────────────────────

local function onShipSpawned(data: any)
	if type(data) ~= "table" then return end

	local shipId  = data.ShipId
	local ownerId = data.OwnerId

	-- Clone the workspace model for this ship (all players, not just local)
	local model = spawnWorkspaceModel(
		data.ModelId,
		shipId,
		data.Position or Vector3.zero,
		data.Orientation or 0
	)
	if not model then return end

	workspaceShips[shipId] = model

	-- Track local player's ship for input + camera
	if ownerId == LocalPlayer.UserId then
		localShipId    = shipId
		localShipModel = model
		inputDisabled  = false
		throttle       = 0
		rudder         = 0
		print("[ShipController] Local ship spawned:", shipId)
	end
end

local function onShipDespawned(data: any)
	if type(data) ~= "table" then return end

	local shipId = data.ShipId
	local model  = workspaceShips[shipId]
	if model then
		model:Destroy()
		workspaceShips[shipId] = nil
	end

	if shipId == localShipId then
		localShipId    = nil
		localShipModel = nil
		inputDisabled  = false
	end
end

local function onShipDestroyed(data: any)
	if type(data) ~= "table" then return end
	-- Disable local input while the sink animation plays.
	-- ShipSystem fires ShipDespawned (and cleans up the model) after 3 seconds.
	if data.ShipId == localShipId then
		inputDisabled = true
		-- Zero out input so the server sees no movement during the sink
		if ShipMoveInput and (throttle ~= 0 or rudder ~= 0) then
			ShipMoveInput:FireServer({ forward = 0, turn = 0 })
		end
		throttle = 0
		rudder   = 0
	end
end

-- Called by ShipSystem every ~3 physics ticks (~15x/sec). Repositions all
-- workspace ship models to match authoritative server state.
local function onShipStateUpdate(snapshot: any)
	if type(snapshot) ~= "table" then return end

	for _, state in ipairs(snapshot) do
		local model = workspaceShips[state.ShipId]
		if not model then continue end

		-- PivotTo positions the whole model; cosmetic TiltPart tilt is applied
		-- separately in onHeartbeat on the child part and is not overridden here.
		model:PivotTo(
			CFrame.new(state.Position) * CFrame.Angles(0, math.rad(state.Orientation or 0), 0)
		)
	end
end

-- ─── Input loop ──────────────────────────────────────────────────────────────

local KEYS = {
	forward = Enum.KeyCode.W,
	reverse = Enum.KeyCode.S,
	left    = Enum.KeyCode.A,
	right   = Enum.KeyCode.D,
}

local function onHeartbeat(_dt)
	if not localShipModel or inputDisabled then return end

	local prevThrottle = throttle
	local prevRudder   = rudder

	throttle = 0
	rudder   = 0
	if UserInputService:IsKeyDown(KEYS.forward) then throttle =  1 end
	if UserInputService:IsKeyDown(KEYS.reverse) then throttle = -1 end
	if UserInputService:IsKeyDown(KEYS.left)    then rudder   = -1 end
	if UserInputService:IsKeyDown(KEYS.right)   then rudder   =  1 end

	if throttle ~= prevThrottle or rudder ~= prevRudder then
		if ShipMoveInput then
			ShipMoveInput:FireServer({ forward = throttle, turn = rudder })
		end
		updateShipTilt()
	end

	updateWake()
	updateEngineSound()
end

-- ─── Weapon input ────────────────────────────────────────────────────────────

local function getAimDirection(): Vector3
	if not localShipModel or not localShipModel.PrimaryPart then
		return Vector3.new(0, 0, -1)
	end
	local origin = localShipModel.PrimaryPart.Position
	local target = Mouse.Hit.Position
	return (target - origin).Unit
end

local function onInputBegan(input: InputObject, gameProcessed: boolean)
	if gameProcessed then return end
	if not localShipModel or inputDisabled then return end

	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		if FireWeapon then
			FireWeapon:FireServer("primary", localShipModel.PrimaryPart.Position, getAimDirection())
		end

	elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
		if UseAbility then
			UseAbility:FireServer(getAimDirection())
		else
			-- Retry lookup — UseAbility may have been added after init
			UseAbility = Remotes and Remotes:FindFirstChild("UseAbility")
			if UseAbility then
				UseAbility:FireServer(getAimDirection())
			end
		end
	end
end

-- ─── Public API ──────────────────────────────────────────────────────────────

local ShipController = {}

function ShipController.init()
	setupCrosshair()

	-- Ship lifecycle — listen to server broadcasts from ShipSystem (#88)
	if ShipSpawnedRE   then ShipSpawnedRE.OnClientEvent:Connect(onShipSpawned)     end
	if ShipDespawnedRE then ShipDespawnedRE.OnClientEvent:Connect(onShipDespawned) end
	if ShipDestroyedRE then ShipDestroyedRE.OnClientEvent:Connect(onShipDestroyed) end
	if ShipStateRE     then ShipStateRE.OnClientEvent:Connect(onShipStateUpdate)   end

	-- Input
	RunService.Heartbeat:Connect(onHeartbeat)
	UserInputService.InputBegan:Connect(onInputBegan)

	print("[ShipController] Initialized — waiting for ShipSpawned events.")
end

return ShipController