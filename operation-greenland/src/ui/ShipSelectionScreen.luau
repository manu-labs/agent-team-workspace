-- ShipSelectionScreen.luau
-- Full-screen ship selection overlay shown during the Deploying Phase.
-- Players pick one of three ships, then hit Ready to confirm.
-- Listens to SetGamePhase to show/hide; fires PlayerReady on confirm.

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService      = game:GetService("TweenService")

local LocalPlayer = Players.LocalPlayer

-- RemoteEvents (created server-side by GameManager #87)
local Remotes            = ReplicatedStorage:WaitForChild("Remotes", 10)
local SetGamePhaseEvent  = Remotes:WaitForChild("SetGamePhase", 10)
local PlayerReadyEvent   = Remotes:WaitForChild("PlayerReady", 10)
local ReadyCountEvent    = Remotes:WaitForChild("ReadyCountUpdated", 10)

-- ─── Ship data ──────────────────────────────────────────────────────────────
-- TODO: import from ReplicatedStorage.Shared.ShipConfig once #86 is merged.
-- For now stats are hardcoded; values are 0..1 normalised for stat bars.

local SHIPS = {
	{
		id          = "Destroyer",
		name        = "Destroyer",
		color       = Color3.fromRGB(70, 130, 180),   -- steel blue placeholder
		stats       = { speed = 0.85, health = 0.50, firepower = 0.75 },
		ability     = "Torpedo Salvo — fires three torpedoes in a spread",
	},
	{
		id          = "AircraftCarrier",
		name        = "Aircraft Carrier",
		color       = Color3.fromRGB(100, 100, 140),
		stats       = { speed = 0.35, health = 1.00, firepower = 0.60 },
		ability     = "Air Strike — calls in a bombing run on a target area",
	},
	{
		id          = "SupplyShip",
		name        = "Supply Ship",
		color       = Color3.fromRGB(80, 160, 80),
		stats       = { speed = 0.55, health = 0.65, firepower = 0.25 },
		ability     = "Repair Beacon — heals nearby friendly ships over time",
	},
}

-- ─── Colours ─────────────────────────────────────────────────────────────────

local COLOR = {
	bg              = Color3.fromRGB(10, 20, 40),
	cardNormal      = Color3.fromRGB(20, 35, 60),
	cardSelected    = Color3.fromRGB(30, 80, 140),
	cardBorder      = Color3.fromRGB(60, 100, 160),
	cardBorderSel   = Color3.fromRGB(100, 180, 255),
	statBarBg       = Color3.fromRGB(20, 20, 30),
	statBarFill     = Color3.fromRGB(80, 200, 255),
	textPrimary     = Color3.new(1, 1, 1),
	textSecondary   = Color3.fromRGB(180, 200, 220),
	readyBtn        = Color3.fromRGB(30, 160, 60),
	readyBtnHover   = Color3.fromRGB(50, 200, 80),
	readyBtnDisabled= Color3.fromRGB(60, 60, 60),
}

-- ─── State ───────────────────────────────────────────────────────────────────

local selectedShipId = nil   -- currently selected ship id string
local cardFrames     = {}    -- shipId -> card Frame for highlight updates
local isReady        = false

-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- Create a labelled stat bar (Speed / Health / Firepower)
local function makeStatBar(parent, label, fillFraction, index)
	local row = Instance.new("Frame", parent)
	row.Name              = label .. "Row"
	row.Size              = UDim2.new(1, 0, 0, 18)
	row.BackgroundTransparency = 1
	row.LayoutOrder       = index

	local lbl = Instance.new("TextLabel", row)
	lbl.Size              = UDim2.new(0.35, 0, 1, 0)
	lbl.BackgroundTransparency = 1
	lbl.Text              = label
	lbl.TextColor3        = COLOR.textSecondary
	lbl.TextScaled        = true
	lbl.Font              = Enum.Font.GothamMedium
	lbl.TextXAlignment    = Enum.TextXAlignment.Left
	Instance.new("UITextSizeConstraint", lbl).MaxTextSize = 14

	local barBg = Instance.new("Frame", row)
	barBg.Name            = "BarBg"
	barBg.Size            = UDim2.new(0.65, -4, 0.6, 0)
	barBg.Position        = UDim2.new(0.35, 4, 0.2, 0)
	barBg.BackgroundColor3 = COLOR.statBarBg
	barBg.BorderSizePixel = 0
	Instance.new("UICorner", barBg).CornerRadius = UDim.new(1, 0)

	local fill = Instance.new("Frame", barBg)
	fill.Name             = "Fill"
	fill.Size             = UDim2.new(math.clamp(fillFraction, 0, 1), 0, 1, 0)
	fill.BackgroundColor3 = COLOR.statBarFill
	fill.BorderSizePixel  = 0
	Instance.new("UICorner", fill).CornerRadius = UDim.new(1, 0)

	return row
end

-- Build one ship card Frame
local function makeCard(ship)
	local card = Instance.new("Frame")
	card.Name             = ship.id .. "Card"
	card.Size             = UDim2.new(0, 260, 1, -20)
	card.BackgroundColor3 = COLOR.cardNormal
	card.BorderSizePixel  = 0

	local corner = Instance.new("UICorner", card)
	corner.CornerRadius   = UDim.new(0, 10)

	local stroke = Instance.new("UIStroke", card)
	stroke.Name           = "Border"
	stroke.Color          = COLOR.cardBorder
	stroke.Thickness      = 2

	-- Sizing constraint so cards don't get too wide or narrow
	local sizeConstraint  = Instance.new("UISizeConstraint", card)
	sizeConstraint.MinSize = Vector2.new(200, 300)
	sizeConstraint.MaxSize = Vector2.new(320, 600)

	local layout = Instance.new("UIListLayout", card)
	layout.FillDirection  = Enum.FillDirection.Vertical
	layout.Padding        = UDim.new(0, 10)
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Center

	local padding = Instance.new("UIPadding", card)
	padding.PaddingTop    = UDim.new(0, 14)
	padding.PaddingBottom = UDim.new(0, 14)
	padding.PaddingLeft   = UDim.new(0, 14)
	padding.PaddingRight  = UDim.new(0, 14)

	-- Ship icon (placeholder coloured frame; replace with ImageLabel when assets arrive)
	local icon            = Instance.new("Frame", card)
	icon.Name             = "Icon"
	icon.Size             = UDim2.new(1, 0, 0, 100)
	icon.BackgroundColor3 = ship.color
	icon.BorderSizePixel  = 0
	icon.LayoutOrder      = 1
	Instance.new("UICorner", icon).CornerRadius = UDim.new(0, 6)
	-- Label inside icon so it's obvious what it represents
	local iconLabel       = Instance.new("TextLabel", icon)
	iconLabel.Size        = UDim2.fromScale(1, 1)
	iconLabel.BackgroundTransparency = 1
	iconLabel.Text        = ship.name
	iconLabel.TextColor3  = Color3.new(1, 1, 1)
	iconLabel.TextScaled  = true
	iconLabel.Font        = Enum.Font.GothamBold

	-- Ship name
	local nameLabel       = Instance.new("TextLabel", card)
	nameLabel.Name        = "ShipName"
	nameLabel.Size        = UDim2.new(1, 0, 0, 24)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Text        = ship.name
	nameLabel.TextColor3  = COLOR.textPrimary
	nameLabel.TextScaled  = true
	nameLabel.Font        = Enum.Font.GothamBold
	nameLabel.LayoutOrder = 2
	Instance.new("UITextSizeConstraint", nameLabel).MaxTextSize = 20

	-- Stat bars container
	local statsFrame      = Instance.new("Frame", card)
	statsFrame.Name       = "Stats"
	statsFrame.Size       = UDim2.new(1, 0, 0, 80)
	statsFrame.BackgroundTransparency = 1
	statsFrame.LayoutOrder = 3
	local statsLayout     = Instance.new("UIListLayout", statsFrame)
	statsLayout.FillDirection = Enum.FillDirection.Vertical
	statsLayout.Padding   = UDim.new(0, 4)

	makeStatBar(statsFrame, "Speed",     ship.stats.speed,     1)
	makeStatBar(statsFrame, "Health",    ship.stats.health,    2)
	makeStatBar(statsFrame, "Firepower", ship.stats.firepower, 3)

	-- Ability description
	local abilityLabel    = Instance.new("TextLabel", card)
	abilityLabel.Name     = "Ability"
	abilityLabel.Size     = UDim2.new(1, 0, 0, 50)
	abilityLabel.BackgroundTransparency = 1
	abilityLabel.Text     = ship.ability
	abilityLabel.TextColor3 = COLOR.textSecondary
	abilityLabel.TextScaled = true
	abilityLabel.TextWrapped = true
	abilityLabel.Font     = Enum.Font.Gotham
	abilityLabel.LayoutOrder = 4
	Instance.new("UITextSizeConstraint", abilityLabel).MaxTextSize = 13

	return card
end

-- Highlight the selected card, reset all others
local function updateCardHighlight(readyBtn)
	for id, card in pairs(cardFrames) do
		local stroke = card:FindFirstChild("Border")
		if id == selectedShipId then
			card.BackgroundColor3       = COLOR.cardSelected
			if stroke then stroke.Color = COLOR.cardBorderSel; stroke.Thickness = 3 end
		else
			card.BackgroundColor3       = COLOR.cardNormal
			if stroke then stroke.Color = COLOR.cardBorder; stroke.Thickness = 2 end
		end
	end
	-- Enable/disable Ready button
	if readyBtn then
		if selectedShipId and not isReady then
			readyBtn.BackgroundColor3    = COLOR.readyBtn
			readyBtn.Active              = true
		else
			readyBtn.BackgroundColor3    = COLOR.readyBtnDisabled
			readyBtn.Active              = false
		end
	end
end

-- ─── Build GUI ───────────────────────────────────────────────────────────────

local function buildGui()
	local playerGui = LocalPlayer:WaitForChild("PlayerGui")

	local screenGui              = Instance.new("ScreenGui", playerGui)
	screenGui.Name               = "ShipSelectionGui"
	screenGui.ResetOnSpawn       = false
	screenGui.IgnoreGuiInset     = true
	screenGui.DisplayOrder       = 5
	screenGui.Enabled            = false   -- hidden until SetGamePhase fires

	-- Semi-transparent dark background
	local bg                     = Instance.new("Frame", screenGui)
	bg.Name                      = "Background"
	bg.Size                      = UDim2.fromScale(1, 1)
	bg.BackgroundColor3          = COLOR.bg
	bg.BackgroundTransparency    = 0.15
	bg.BorderSizePixel           = 0

	-- Title
	local title                  = Instance.new("TextLabel", bg)
	title.Name                   = "Title"
	title.Size                   = UDim2.new(1, 0, 0, 60)
	title.Position               = UDim2.fromScale(0, 0)
	title.BackgroundTransparency = 1
	title.Text                   = "SELECT YOUR VESSEL"
	title.TextColor3             = COLOR.textPrimary
	title.TextScaled             = true
	title.Font                   = Enum.Font.GothamBold
	Instance.new("UITextSizeConstraint", title).MaxTextSize = 36

	-- Cards container (centered, horizontal)
	local cardContainer          = Instance.new("Frame", bg)
	cardContainer.Name           = "CardContainer"
	cardContainer.Size           = UDim2.new(0.85, 0, 0.70, 0)
	cardContainer.Position       = UDim2.new(0.075, 0, 0.12, 0)
	cardContainer.BackgroundTransparency = 1

	-- Maintain aspect ratio so cards look the same across resolutions
	local arc                    = Instance.new("UIAspectRatioConstraint", cardContainer)
	arc.AspectRatio              = 2.2
	arc.DominantAxis             = Enum.DominantAxis.Width

	local cardsLayout            = Instance.new("UIListLayout", cardContainer)
	cardsLayout.FillDirection    = Enum.FillDirection.Horizontal
	cardsLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	cardsLayout.VerticalAlignment   = Enum.VerticalAlignment.Center
	cardsLayout.Padding          = UDim.new(0, 20)

	-- Ready button (built early so updateCardHighlight can reference it)
	local readyBtn               = Instance.new("TextButton", bg)
	readyBtn.Name                = "ReadyButton"
	readyBtn.Size                = UDim2.new(0, 220, 0, 54)
	readyBtn.Position            = UDim2.new(0.5, -110, 0.87, 0)
	readyBtn.BackgroundColor3    = COLOR.readyBtnDisabled
	readyBtn.BorderSizePixel     = 0
	readyBtn.Text                = "READY"
	readyBtn.TextColor3          = Color3.new(1, 1, 1)
	readyBtn.TextScaled          = true
	readyBtn.Font                = Enum.Font.GothamBold
	readyBtn.Active              = false
	Instance.new("UICorner", readyBtn).CornerRadius = UDim.new(0, 8)
	Instance.new("UITextSizeConstraint", readyBtn).MaxTextSize = 22

	readyBtn.MouseEnter:Connect(function()
		if selectedShipId and not isReady then
			TweenService:Create(readyBtn,
				TweenInfo.new(0.1), { BackgroundColor3 = COLOR.readyBtnHover }):Play()
		end
	end)
	readyBtn.MouseLeave:Connect(function()
		if selectedShipId and not isReady then
			TweenService:Create(readyBtn,
				TweenInfo.new(0.1), { BackgroundColor3 = COLOR.readyBtn }):Play()
		end
	end)
	readyBtn.Activated:Connect(function()
		if not selectedShipId or isReady then return end
		isReady = true
		readyBtn.Text = "WAITING..."
		readyBtn.BackgroundColor3 = COLOR.readyBtnDisabled
		readyBtn.Active = false
		PlayerReadyEvent:FireServer(selectedShipId)
	end)

	-- Ready count label ("X/Y players ready")
	local readyCount             = Instance.new("TextLabel", bg)
	readyCount.Name              = "ReadyCount"
	readyCount.Size              = UDim2.new(0, 260, 0, 28)
	readyCount.Position          = UDim2.new(0.5, -130, 0.93, 0)
	readyCount.BackgroundTransparency = 1
	readyCount.Text              = "0/0 players ready"
	readyCount.TextColor3        = COLOR.textSecondary
	readyCount.TextScaled        = true
	readyCount.Font              = Enum.Font.Gotham
	Instance.new("UITextSizeConstraint", readyCount).MaxTextSize = 16

	-- Build ship cards
	for _, ship in ipairs(SHIPS) do
		local card = makeCard(ship)
		card.Parent = cardContainer
		cardFrames[ship.id] = card

		-- Click to select
		local btn = Instance.new("TextButton", card)
		btn.Size                    = UDim2.fromScale(1, 1)
		btn.Position                = UDim2.fromScale(0, 0)
		btn.BackgroundTransparency  = 1
		btn.Text                    = ""
		btn.ZIndex                  = card.ZIndex + 10
		btn.Activated:Connect(function()
			if isReady then return end
			selectedShipId = ship.id
			updateCardHighlight(readyBtn)
		end)
	end

	updateCardHighlight(readyBtn)

	-- Listen for ready count updates from server
	ReadyCountEvent.OnClientEvent:Connect(function(readyNum, total)
		readyCount.Text = readyNum .. "/" .. total .. " players ready"
	end)

	-- Show/hide based on game phase
	SetGamePhaseEvent.OnClientEvent:Connect(function(phaseName)
		screenGui.Enabled = (phaseName == "Deploying")
		if screenGui.Enabled then
			-- Reset ready state when a new deployment phase starts
			isReady          = false
			selectedShipId   = nil
			readyBtn.Text    = "READY"
			updateCardHighlight(readyBtn)
		end
	end)

	return screenGui
end

-- ─── Module ──────────────────────────────────────────────────────────────────

local ShipSelectionScreen = {}

function ShipSelectionScreen.init()
	buildGui()
	print("[ShipSelectionScreen] Initialized.")
end

return ShipSelectionScreen