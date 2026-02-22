-- ShipSelectionScreen.luau
-- Full-screen ship selection overlay shown during the Deploying phase.
-- Players pick one of three ships, then confirm with Ready.
-- Listens to GameStateChanged to show/hide; fires PlayerSelectShip on card
-- click and PlayerReady (no args) on the Ready button.

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService      = game:GetService("TweenService")

local LocalPlayer = Players.LocalPlayer

-- RemoteEvents (created by GameManager #87 in ReplicatedStorage.Remotes)
local Remotes              = ReplicatedStorage:WaitForChild("Remotes", 10)
local GameStateChangedEvent= Remotes and Remotes:WaitForChild("GameStateChanged", 10)
local PlayerSelectShipEvent= Remotes and Remotes:WaitForChild("PlayerSelectShip", 10)
local PlayerReadyEvent     = Remotes and Remotes:WaitForChild("PlayerReady", 10)
local ReadyCountEvent      = Remotes and Remotes:WaitForChild("ReadyCountUpdated", 10)

-- ─── Ship data ───────────────────────────────────────────────────────────────
-- TODO: import from ReplicatedStorage.Shared.ShipConfig once #86 is merged.

local SHIPS = {
	{
		id       = "Destroyer",
		name     = "Destroyer",
		color    = Color3.fromRGB(70, 130, 180),
		stats    = { speed = 0.85, health = 0.50, firepower = 0.75 },
		ability  = "Torpedo Salvo — fires three torpedoes in a spread",
	},
	{
		id       = "AircraftCarrier",
		name     = "Aircraft Carrier",
		color    = Color3.fromRGB(100, 100, 140),
		stats    = { speed = 0.35, health = 1.00, firepower = 0.60 },
		ability  = "Air Strike — calls in a bombing run on a target area",
	},
	{
		id       = "SupplyShip",
		name     = "Supply Ship",
		color    = Color3.fromRGB(80, 160, 80),
		stats    = { speed = 0.55, health = 0.65, firepower = 0.25 },
		ability  = "Repair Beacon — heals nearby friendly ships over time",
	},
}

local COLOR = {
	bg            = Color3.fromRGB(10, 20, 40),
	cardNormal    = Color3.fromRGB(20, 35, 60),
	cardSelected  = Color3.fromRGB(30, 80, 140),
	cardBorder    = Color3.fromRGB(60, 100, 160),
	cardBorderSel = Color3.fromRGB(100, 180, 255),
	statBarBg     = Color3.fromRGB(20, 20, 30),
	statBarFill   = Color3.fromRGB(80, 200, 255),
	textPrimary   = Color3.new(1, 1, 1),
	textSecondary = Color3.fromRGB(180, 200, 220),
	readyBtn      = Color3.fromRGB(30, 160, 60),
	readyBtnHover = Color3.fromRGB(50, 200, 80),
	readyBtnOff   = Color3.fromRGB(60, 60, 60),
}

local selectedShipId = nil
local cardFrames     = {}
local isReady        = false

-- ─── Helpers ─────────────────────────────────────────────────────────────────

local function makeStatBar(parent, label, fillFraction, order)
	local row = Instance.new("Frame")
	row.Name              = label .. "Row"
	row.Size              = UDim2.new(1, 0, 0, 18)
	row.BackgroundTransparency = 1
	row.LayoutOrder       = order
	row.Parent            = parent

	local lbl = Instance.new("TextLabel")
	lbl.Size              = UDim2.new(0.35, 0, 1, 0)
	lbl.BackgroundTransparency = 1
	lbl.Text              = label
	lbl.TextColor3        = COLOR.textSecondary
	lbl.TextScaled        = true
	lbl.Font              = Enum.Font.GothamMedium
	lbl.TextXAlignment    = Enum.TextXAlignment.Left
	lbl.Parent            = row
	Instance.new("UITextSizeConstraint", lbl).MaxTextSize = 14

	local barBg = Instance.new("Frame")
	barBg.Size             = UDim2.new(0.65, -4, 0.6, 0)
	barBg.Position         = UDim2.new(0.35, 4, 0.2, 0)
	barBg.BackgroundColor3 = COLOR.statBarBg
	barBg.BorderSizePixel  = 0
	barBg.Parent           = row
	Instance.new("UICorner", barBg).CornerRadius = UDim.new(1, 0)

	local fill = Instance.new("Frame")
	fill.Size              = UDim2.new(math.clamp(fillFraction, 0, 1), 0, 1, 0)
	fill.BackgroundColor3  = COLOR.statBarFill
	fill.BorderSizePixel   = 0
	fill.Parent            = barBg
	Instance.new("UICorner", fill).CornerRadius = UDim.new(1, 0)
end

local function makeCard(ship)
	local card = Instance.new("Frame")
	card.Name              = ship.id .. "Card"
	card.Size              = UDim2.new(0, 260, 1, -20)
	card.BackgroundColor3  = COLOR.cardNormal
	card.BorderSizePixel   = 0

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 10)
	corner.Parent = card

	local stroke = Instance.new("UIStroke")
	stroke.Name      = "Border"
	stroke.Color     = COLOR.cardBorder
	stroke.Thickness = 2
	stroke.Parent    = card

	local sizeC = Instance.new("UISizeConstraint")
	sizeC.MinSize = Vector2.new(200, 300)
	sizeC.MaxSize = Vector2.new(320, 600)
	sizeC.Parent  = card

	local layout = Instance.new("UIListLayout")
	layout.FillDirection        = Enum.FillDirection.Vertical
	layout.Padding              = UDim.new(0, 10)
	layout.HorizontalAlignment  = Enum.HorizontalAlignment.Center
	layout.Parent               = card

	local pad = Instance.new("UIPadding")
	pad.PaddingTop    = UDim.new(0, 14)
	pad.PaddingBottom = UDim.new(0, 14)
	pad.PaddingLeft   = UDim.new(0, 14)
	pad.PaddingRight  = UDim.new(0, 14)
	pad.Parent        = card

	-- Icon placeholder (replace with ImageLabel when art assets arrive)
	local icon = Instance.new("Frame")
	icon.Name              = "Icon"
	icon.Size              = UDim2.new(1, 0, 0, 100)
	icon.BackgroundColor3  = ship.color
	icon.BorderSizePixel   = 0
	icon.LayoutOrder       = 1
	icon.Parent            = card
	Instance.new("UICorner", icon).CornerRadius = UDim.new(0, 6)
	local iconLbl = Instance.new("TextLabel")
	iconLbl.Size             = UDim2.fromScale(1, 1)
	iconLbl.BackgroundTransparency = 1
	iconLbl.Text             = ship.name
	iconLbl.TextColor3       = Color3.new(1, 1, 1)
	iconLbl.TextScaled       = true
	iconLbl.Font             = Enum.Font.GothamBold
	iconLbl.Parent           = icon

	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size             = UDim2.new(1, 0, 0, 24)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text             = ship.name
	nameLabel.TextColor3       = COLOR.textPrimary
	nameLabel.TextScaled       = true
	nameLabel.Font             = Enum.Font.GothamBold
	nameLabel.LayoutOrder      = 2
	nameLabel.Parent           = card
	Instance.new("UITextSizeConstraint", nameLabel).MaxTextSize = 20

	local statsFrame = Instance.new("Frame")
	statsFrame.Size                = UDim2.new(1, 0, 0, 80)
	statsFrame.BackgroundTransparency = 1
	statsFrame.LayoutOrder         = 3
	statsFrame.Parent              = card
	local statsLayout = Instance.new("UIListLayout")
	statsLayout.FillDirection = Enum.FillDirection.Vertical
	statsLayout.Padding       = UDim.new(0, 4)
	statsLayout.Parent        = statsFrame

	makeStatBar(statsFrame, "Speed",     ship.stats.speed,     1)
	makeStatBar(statsFrame, "Health",    ship.stats.health,    2)
	makeStatBar(statsFrame, "Firepower", ship.stats.firepower, 3)

	local abilityLabel = Instance.new("TextLabel")
	abilityLabel.Size              = UDim2.new(1, 0, 0, 50)
	abilityLabel.BackgroundTransparency = 1
	abilityLabel.Text              = ship.ability
	abilityLabel.TextColor3        = COLOR.textSecondary
	abilityLabel.TextScaled        = true
	abilityLabel.TextWrapped       = true
	abilityLabel.Font              = Enum.Font.Gotham
	abilityLabel.LayoutOrder       = 4
	abilityLabel.Parent            = card
	Instance.new("UITextSizeConstraint", abilityLabel).MaxTextSize = 13

	return card
end

local function updateCardHighlight(readyBtn)
	for id, card in pairs(cardFrames) do
		local stroke = card:FindFirstChild("Border")
		if id == selectedShipId then
			card.BackgroundColor3 = COLOR.cardSelected
			if stroke then stroke.Color = COLOR.cardBorderSel; stroke.Thickness = 3 end
		else
			card.BackgroundColor3 = COLOR.cardNormal
			if stroke then stroke.Color = COLOR.cardBorder; stroke.Thickness = 2 end
		end
	end
	if readyBtn then
		local canReady = selectedShipId ~= nil and not isReady
		readyBtn.BackgroundColor3 = canReady and COLOR.readyBtn or COLOR.readyBtnOff
		readyBtn.Active           = canReady
	end
end

-- ─── Build GUI ───────────────────────────────────────────────────────────────

local function buildGui()
	local playerGui = LocalPlayer:WaitForChild("PlayerGui")

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name             = "ShipSelectionGui"
	screenGui.ResetOnSpawn     = false
	screenGui.IgnoreGuiInset   = true
	screenGui.DisplayOrder     = 5
	screenGui.Enabled          = false
	screenGui.Parent           = playerGui

	local bg = Instance.new("Frame")
	bg.Name                 = "Background"
	bg.Size                 = UDim2.fromScale(1, 1)
	bg.BackgroundColor3     = COLOR.bg
	bg.BackgroundTransparency = 0.15
	bg.BorderSizePixel      = 0
	bg.Parent               = screenGui

	local title = Instance.new("TextLabel")
	title.Size              = UDim2.new(1, 0, 0, 60)
	title.BackgroundTransparency = 1
	title.Text              = "SELECT YOUR VESSEL"
	title.TextColor3        = COLOR.textPrimary
	title.TextScaled        = true
	title.Font              = Enum.Font.GothamBold
	title.Parent            = bg
	Instance.new("UITextSizeConstraint", title).MaxTextSize = 36

	local cardContainer = Instance.new("Frame")
	cardContainer.Name              = "CardContainer"
	cardContainer.Size              = UDim2.new(0.85, 0, 0.70, 0)
	cardContainer.Position          = UDim2.new(0.075, 0, 0.12, 0)
	cardContainer.BackgroundTransparency = 1
	cardContainer.Parent            = bg

	local arc = Instance.new("UIAspectRatioConstraint")
	arc.AspectRatio   = 2.2
	arc.DominantAxis  = Enum.DominantAxis.Width
	arc.Parent        = cardContainer

	local cardsLayout = Instance.new("UIListLayout")
	cardsLayout.FillDirection         = Enum.FillDirection.Horizontal
	cardsLayout.HorizontalAlignment   = Enum.HorizontalAlignment.Center
	cardsLayout.VerticalAlignment     = Enum.VerticalAlignment.Center
	cardsLayout.Padding               = UDim.new(0, 20)
	cardsLayout.Parent                = cardContainer

	-- Ready button
	local readyBtn = Instance.new("TextButton")
	readyBtn.Name              = "ReadyButton"
	readyBtn.Size              = UDim2.new(0, 220, 0, 54)
	readyBtn.Position          = UDim2.new(0.5, -110, 0.87, 0)
	readyBtn.BackgroundColor3  = COLOR.readyBtnOff
	readyBtn.BorderSizePixel   = 0
	readyBtn.Text              = "READY"
	readyBtn.TextColor3        = Color3.new(1, 1, 1)
	readyBtn.TextScaled        = true
	readyBtn.Font              = Enum.Font.GothamBold
	readyBtn.Active            = false
	readyBtn.Parent            = bg
	Instance.new("UICorner", readyBtn).CornerRadius = UDim.new(0, 8)
	Instance.new("UITextSizeConstraint", readyBtn).MaxTextSize = 22

	readyBtn.MouseEnter:Connect(function()
		if readyBtn.Active then
			TweenService:Create(readyBtn, TweenInfo.new(0.1), { BackgroundColor3 = COLOR.readyBtnHover }):Play()
		end
	end)
	readyBtn.MouseLeave:Connect(function()
		if readyBtn.Active then
			TweenService:Create(readyBtn, TweenInfo.new(0.1), { BackgroundColor3 = COLOR.readyBtn }):Play()
		end
	end)
	readyBtn.Activated:Connect(function()
		if not readyBtn.Active then return end
		isReady = true
		readyBtn.Text   = "WAITING..."
		readyBtn.Active = false
		readyBtn.BackgroundColor3 = COLOR.readyBtnOff
		-- Fire PlayerReady with no args (ship was already sent via PlayerSelectShip on card click)
		if PlayerReadyEvent then PlayerReadyEvent:FireServer() end
	end)

	local readyCount = Instance.new("TextLabel")
	readyCount.Name              = "ReadyCount"
	readyCount.Size              = UDim2.new(0, 260, 0, 28)
	readyCount.Position          = UDim2.new(0.5, -130, 0.93, 0)
	readyCount.BackgroundTransparency = 1
	readyCount.Text              = "0/0 players ready"
	readyCount.TextColor3        = COLOR.textSecondary
	readyCount.TextScaled        = true
	readyCount.Font              = Enum.Font.Gotham
	readyCount.Parent            = bg
	Instance.new("UITextSizeConstraint", readyCount).MaxTextSize = 16

	-- Build ship cards
	for _, ship in ipairs(SHIPS) do
		local card = makeCard(ship)
		card.Parent = cardContainer
		cardFrames[ship.id] = card

		local btn = Instance.new("TextButton")
		btn.Size                   = UDim2.fromScale(1, 1)
		btn.BackgroundTransparency = 1
		btn.Text                   = ""
		btn.ZIndex                 = card.ZIndex + 10
		btn.Parent                 = card
		btn.Activated:Connect(function()
			if isReady then return end
			selectedShipId = ship.id
			updateCardHighlight(readyBtn)
			-- Fire PlayerSelectShip immediately so server knows our selection
			if PlayerSelectShipEvent then
				PlayerSelectShipEvent:FireServer(ship.id)
			end
		end)
	end

	updateCardHighlight(readyBtn)

	if ReadyCountEvent then
		ReadyCountEvent.OnClientEvent:Connect(function(readyNum, total)
			readyCount.Text = readyNum .. "/" .. total .. " players ready"
		end)
	end

	if GameStateChangedEvent then
		GameStateChangedEvent.OnClientEvent:Connect(function(newState, _oldState)
			screenGui.Enabled = (newState == "Deploying")
			if newState == "Deploying" then
				isReady        = false
				selectedShipId = nil
				readyBtn.Text  = "READY"
				updateCardHighlight(readyBtn)
			end
		end)
	end
end

-- ─── Module ──────────────────────────────────────────────────────────────────

local ShipSelectionScreen = {}

function ShipSelectionScreen.init()
	buildGui()
	print("[ShipSelectionScreen] Initialized.")
end

return ShipSelectionScreen