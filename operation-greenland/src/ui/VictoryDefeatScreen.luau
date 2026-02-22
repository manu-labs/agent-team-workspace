-- VictoryDefeatScreen.luau
-- Full-screen end-of-round overlay shown when RoundEnded fires.
-- Displays victory/defeat title with animated scale-up, personal stats,
-- team summary, and a Play Again button.

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService      = game:GetService("TweenService")

local LocalPlayer = Players.LocalPlayer

-- RemoteEvents
local Remotes           = ReplicatedStorage:WaitForChild("Remotes", 10)
local RoundEndedEvent   = Remotes:WaitForChild("RoundEnded", 10)
local PlayAgainEvent    = Remotes:WaitForChild("PlayAgain", 10)

-- ─── Colours ─────────────────────────────────────────────────────────────────

local COLOR = {
	bg            = Color3.fromRGB(5, 10, 20),
	victoryTitle  = Color3.fromRGB(80, 230, 100),
	defeatTitle   = Color3.fromRGB(230, 70, 70),
	statLabel     = Color3.fromRGB(160, 185, 210),
	statValue     = Color3.new(1, 1, 1),
	playAgainNorm = Color3.fromRGB(40, 160, 70),
	playAgainHov  = Color3.fromRGB(60, 210, 90),
	panel         = Color3.fromRGB(12, 22, 42),
}

-- ─── Helpers ─────────────────────────────────────────────────────────────────

local function statRow(parent, label, value, layoutOrder)
	local row             = Instance.new("Frame", parent)
	row.Name              = label:gsub("%s+", "") .. "Row"
	row.Size              = UDim2.new(1, 0, 0, 30)
	row.BackgroundTransparency = 1
	row.LayoutOrder       = layoutOrder

	local lbl             = Instance.new("TextLabel", row)
	lbl.Size              = UDim2.fromScale(0.6, 1)
	lbl.BackgroundTransparency = 1
	lbl.Text              = label
	lbl.TextColor3        = COLOR.statLabel
	lbl.TextScaled        = true
	lbl.Font              = Enum.Font.Gotham
	lbl.TextXAlignment    = Enum.TextXAlignment.Left
	Instance.new("UITextSizeConstraint", lbl).MaxTextSize = 18

	local val             = Instance.new("TextLabel", row)
	val.Name              = "Value"
	val.Size              = UDim2.fromScale(0.4, 1)
	val.Position          = UDim2.fromScale(0.6, 0)
	val.BackgroundTransparency = 1
	val.Text              = tostring(value)
	val.TextColor3        = COLOR.statValue
	val.TextScaled        = true
	val.Font              = Enum.Font.GothamBold
	val.TextXAlignment    = Enum.TextXAlignment.Right
	Instance.new("UITextSizeConstraint", val).MaxTextSize = 18

	return row, val
end

-- ─── Build GUI ───────────────────────────────────────────────────────────────

local function buildGui()
	local playerGui = LocalPlayer:WaitForChild("PlayerGui")

	local screenGui           = Instance.new("ScreenGui", playerGui)
	screenGui.Name            = "VictoryDefeatGui"
	screenGui.ResetOnSpawn    = false
	screenGui.IgnoreGuiInset  = true
	screenGui.DisplayOrder    = 20   -- highest — sits above all other UI
	screenGui.Enabled         = false

	-- Semi-transparent dark full-screen overlay
	local overlay             = Instance.new("Frame", screenGui)
	overlay.Name              = "Overlay"
	overlay.Size              = UDim2.fromScale(1, 1)
	overlay.BackgroundColor3  = COLOR.bg
	overlay.BackgroundTransparency = 0.35
	overlay.BorderSizePixel   = 0

	-- Centered content panel
	local contentPanel        = Instance.new("Frame", overlay)
	contentPanel.Name         = "ContentPanel"
	contentPanel.AnchorPoint  = Vector2.new(0.5, 0.5)
	contentPanel.Position     = UDim2.fromScale(0.5, 0.5)
	contentPanel.Size         = UDim2.fromScale(0.50, 0.72)
	contentPanel.BackgroundColor3 = COLOR.panel
	contentPanel.BackgroundTransparency = 0.10
	contentPanel.BorderSizePixel = 0
	Instance.new("UICorner", contentPanel).CornerRadius = UDim.new(0, 14)
	Instance.new("UIStroke", contentPanel).Color = Color3.fromRGB(60, 90, 140)

	local contentLayout       = Instance.new("UIListLayout", contentPanel)
	contentLayout.FillDirection = Enum.FillDirection.Vertical
	contentLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	contentLayout.Padding     = UDim.new(0, 10)

	local contentPad          = Instance.new("UIPadding", contentPanel)
	contentPad.PaddingTop     = UDim.new(0, 24)
	contentPad.PaddingBottom  = UDim.new(0, 24)
	contentPad.PaddingLeft    = UDim.new(0, 32)
	contentPad.PaddingRight   = UDim.new(0, 32)

	-- Title label ("GREENLAND CONQUERED" or "MISSION FAILED")
	local titleLabel          = Instance.new("TextLabel", contentPanel)
	titleLabel.Name           = "Title"
	titleLabel.Size           = UDim2.new(1, 0, 0, 64)
	titleLabel.BackgroundTransparency = 1
	titleLabel.Text           = ""
	titleLabel.TextScaled     = true
	titleLabel.Font           = Enum.Font.GothamBlack
	titleLabel.LayoutOrder    = 1
	Instance.new("UITextSizeConstraint", titleLabel).MaxTextSize = 46

	-- Divider
	local divider             = Instance.new("Frame", contentPanel)
	divider.Size              = UDim2.new(0.9, 0, 0, 2)
	divider.BackgroundColor3  = Color3.fromRGB(60, 90, 140)
	divider.BackgroundTransparency = 0.3
	divider.BorderSizePixel   = 0
	divider.LayoutOrder       = 2

	-- Personal stats section
	local statsSection        = Instance.new("Frame", contentPanel)
	statsSection.Name         = "PersonalStats"
	statsSection.Size         = UDim2.new(1, 0, 0, 180)
	statsSection.BackgroundTransparency = 1
	statsSection.LayoutOrder  = 3

	local statsLayout         = Instance.new("UIListLayout", statsSection)
	statsLayout.FillDirection = Enum.FillDirection.Vertical
	statsLayout.Padding       = UDim.new(0, 4)

	-- Section header
	local statsHeader         = Instance.new("TextLabel", statsSection)
	statsHeader.Size          = UDim2.new(1, 0, 0, 24)
	statsHeader.BackgroundTransparency = 1
	statsHeader.Text          = "Your Performance"
	statsHeader.TextColor3    = Color3.fromRGB(140, 180, 220)
	statsHeader.TextScaled    = true
	statsHeader.Font          = Enum.Font.GothamBold
	statsHeader.TextXAlignment = Enum.TextXAlignment.Left
	statsHeader.LayoutOrder   = 0
	Instance.new("UITextSizeConstraint", statsHeader).MaxTextSize = 16

	-- Placeholder rows — populated in RoundEnded handler
	local _, shipVal   = statRow(statsSection, "Your Ship",         "—", 1)
	local _, killsVal  = statRow(statsSection, "Kills",             "—", 2)
	local _, deathsVal = statRow(statsSection, "Deaths",            "—", 3)
	local _, capVal    = statRow(statsSection, "Territories Captured","—",4)
	local _, scoreVal  = statRow(statsSection, "Score",             "—", 5)

	-- Divider 2
	local divider2            = Instance.new("Frame", contentPanel)
	divider2.Size             = UDim2.new(0.9, 0, 0, 2)
	divider2.BackgroundColor3 = Color3.fromRGB(60, 90, 140)
	divider2.BackgroundTransparency = 0.3
	divider2.BorderSizePixel  = 0
	divider2.LayoutOrder      = 4

	-- Team summary
	local teamSection         = Instance.new("Frame", contentPanel)
	teamSection.Name          = "TeamSummary"
	teamSection.Size          = UDim2.new(1, 0, 0, 80)
	teamSection.BackgroundTransparency = 1
	teamSection.LayoutOrder   = 5

	local teamLayout          = Instance.new("UIListLayout", teamSection)
	teamLayout.FillDirection  = Enum.FillDirection.Vertical
	teamLayout.Padding        = UDim.new(0, 4)

	local teamHeader          = Instance.new("TextLabel", teamSection)
	teamHeader.Size           = UDim2.new(1, 0, 0, 24)
	teamHeader.BackgroundTransparency = 1
	teamHeader.Text           = "Team Summary"
	teamHeader.TextColor3     = Color3.fromRGB(140, 180, 220)
	teamHeader.TextScaled     = true
	teamHeader.Font           = Enum.Font.GothamBold
	teamHeader.TextXAlignment = Enum.TextXAlignment.Left
	teamHeader.LayoutOrder    = 0
	Instance.new("UITextSizeConstraint", teamHeader).MaxTextSize = 16

	local _, zonesVal  = statRow(teamSection, "Zones Captured", "—", 1)
	local _, lossesVal = statRow(teamSection, "Fleet Losses",   "—", 2)

	-- Play Again button
	local playAgainBtn        = Instance.new("TextButton", contentPanel)
	playAgainBtn.Name         = "PlayAgainButton"
	playAgainBtn.Size         = UDim2.new(0.55, 0, 0, 50)
	playAgainBtn.BackgroundColor3 = COLOR.playAgainNorm
	playAgainBtn.BorderSizePixel = 0
	playAgainBtn.Text         = "Play Again"
	playAgainBtn.TextColor3   = Color3.new(1, 1, 1)
	playAgainBtn.TextScaled   = true
	playAgainBtn.Font         = Enum.Font.GothamBold
	playAgainBtn.LayoutOrder  = 6
	Instance.new("UICorner", playAgainBtn).CornerRadius = UDim.new(0, 10)
	Instance.new("UITextSizeConstraint", playAgainBtn).MaxTextSize = 22

	playAgainBtn.MouseEnter:Connect(function()
		TweenService:Create(playAgainBtn, TweenInfo.new(0.12),
			{ BackgroundColor3 = COLOR.playAgainHov }):Play()
	end)
	playAgainBtn.MouseLeave:Connect(function()
		TweenService:Create(playAgainBtn, TweenInfo.new(0.12),
			{ BackgroundColor3 = COLOR.playAgainNorm }):Play()
	end)
	playAgainBtn.Activated:Connect(function()
		PlayAgainEvent:FireServer()
	end)

	-- ── RoundEnded handler ───────────────────────────────────────────────
	RoundEndedEvent.OnClientEvent:Connect(function(result, stats)
		-- Populate stats
		shipVal.Text   = stats.shipType  or "—"
		killsVal.Text  = tostring(stats.kills    or 0)
		deathsVal.Text = tostring(stats.deaths   or 0)
		capVal.Text    = tostring(stats.captures or 0)
		scoreVal.Text  = tostring(stats.score    or 0)
		zonesVal.Text  = (stats.zonesCaptured or 0) .. "/" .. (stats.zonesTotal or 0)
		lossesVal.Text = tostring(stats.fleetLosses or 0) .. " ships"

		-- Victory/defeat title
		if result == "victory" then
			titleLabel.Text       = "GREENLAND CONQUERED"
			titleLabel.TextColor3 = COLOR.victoryTitle
		else
			titleLabel.Text       = "MISSION FAILED"
			titleLabel.TextColor3 = COLOR.defeatTitle
		end

		-- Animate: start title at scale 0, grow to 1
		contentPanel.Size = UDim2.fromScale(0.01, 0.01)  -- shrink to trigger tween
		screenGui.Enabled = true
		TweenService:Create(contentPanel,
			TweenInfo.new(0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
			{ Size = UDim2.fromScale(0.50, 0.72) }):Play()
	end)

	return screenGui
end

-- ─── Module ──────────────────────────────────────────────────────────────────

local VictoryDefeatScreen = {}

function VictoryDefeatScreen.init()
	buildGui()
	print("[VictoryDefeatScreen] Initialized.")
end

return VictoryDefeatScreen