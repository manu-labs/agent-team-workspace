-- Scoreboard.luau
-- Tab-hold scoreboard overlay: player stats table, territory summary, game timer.
-- Shows on Tab InputBegan, hides on Tab InputEnded with a quick TweenService fade.

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService  = game:GetService("UserInputService")
local TweenService      = game:GetService("TweenService")

local LocalPlayer = Players.LocalPlayer

-- RemoteEvents
local Remotes                 = ReplicatedStorage:WaitForChild("Remotes", 10)
local ScoreboardUpdatedEvent  = Remotes:WaitForChild("ScoreboardUpdated", 10)
local GameTimerUpdatedEvent   = Remotes:WaitForChild("GameTimerUpdated", 10)
local TerritoryUpdatedEvent   = Remotes:WaitForChild("TerritoryUpdated", 10)

-- ─── Colours ─────────────────────────────────────────────────────────────────

local COLOR = {
	bg          = Color3.fromRGB(8, 15, 30),
	header      = Color3.fromRGB(15, 30, 55),
	rowEven     = Color3.fromRGB(12, 22, 40),
	rowOdd      = Color3.fromRGB(18, 32, 55),
	rowPlayer   = Color3.fromRGB(20, 50, 90),
	border      = Color3.fromRGB(60, 100, 170),
	textWhite   = Color3.new(1, 1, 1),
	textGray    = Color3.fromRGB(170, 185, 205),
	textHeader  = Color3.fromRGB(140, 200, 255),
	zoneCap     = Color3.fromRGB(60, 120, 220),
	zoneEnemy   = Color3.fromRGB(200, 60, 60),
	zoneContest = Color3.fromRGB(220, 180, 40),
}

-- ─── Utilities ───────────────────────────────────────────────────────────────

local function formatTime(seconds)
	local m = math.floor(seconds / 60)
	local s = math.floor(seconds % 60)
	return string.format("%02d:%02d", m, s)
end

local function textLabel(parent, text, size, pos, color, font, xAlign)
	local lbl                  = Instance.new("TextLabel", parent)
	lbl.Size                   = size
	lbl.Position               = pos or UDim2.fromScale(0, 0)
	lbl.BackgroundTransparency = 1
	lbl.Text                   = text
	lbl.TextColor3             = color or COLOR.textWhite
	lbl.TextScaled             = true
	lbl.Font                   = font or Enum.Font.Gotham
	lbl.TextXAlignment         = xAlign or Enum.TextXAlignment.Center
	Instance.new("UITextSizeConstraint", lbl).MaxTextSize = 16
	return lbl
end

-- ─── Build GUI ───────────────────────────────────────────────────────────────

local function buildGui()
	local playerGui = LocalPlayer:WaitForChild("PlayerGui")

	local screenGui           = Instance.new("ScreenGui", playerGui)
	screenGui.Name            = "ScoreboardGui"
	screenGui.ResetOnSpawn    = false
	screenGui.IgnoreGuiInset  = true
	screenGui.DisplayOrder    = 8
	screenGui.Enabled         = false

	-- Wrapper used for fade tween (tweening BackgroundTransparency of a container
	-- doesn't cascade, so we tween the ScreenGui's children via a wrapper frame)
	local wrapper             = Instance.new("Frame", screenGui)
	wrapper.Name              = "Wrapper"
	wrapper.Size              = UDim2.fromScale(1, 1)
	wrapper.BackgroundTransparency = 1

	-- Main panel (~70% wide, ~65% tall, centered)
	local panel               = Instance.new("Frame", wrapper)
	panel.Name                = "Panel"
	panel.AnchorPoint         = Vector2.new(0.5, 0.5)
	panel.Position            = UDim2.fromScale(0.5, 0.5)
	panel.Size                = UDim2.fromScale(0.70, 0.65)
	panel.BackgroundColor3    = COLOR.bg
	panel.BackgroundTransparency = 0.08
	panel.BorderSizePixel     = 0
	Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 10)
	local stroke              = Instance.new("UIStroke", panel)
	stroke.Color              = COLOR.border
	stroke.Thickness          = 1.5

	-- ── Timer (top of panel) ─────────────────────────────────────────────
	local timerBar            = Instance.new("Frame", panel)
	timerBar.Name             = "TimerBar"
	timerBar.Size             = UDim2.new(1, 0, 0, 36)
	timerBar.BackgroundColor3 = COLOR.header
	timerBar.BackgroundTransparency = 0.2
	timerBar.BorderSizePixel  = 0
	Instance.new("UICorner", timerBar).CornerRadius = UDim.new(0, 10)

	local timerLabel          = textLabel(timerBar, "Round Time: --:--",
		UDim2.fromScale(1, 1), UDim2.fromScale(0, 0), COLOR.textHeader, Enum.Font.GothamBold)

	GameTimerUpdatedEvent.OnClientEvent:Connect(function(secondsRemaining)
		timerLabel.Text = "Round Time: " .. formatTime(secondsRemaining)
	end)

	-- ── Column headers ───────────────────────────────────────────────────
	local COLUMNS = {
		{ label = "Player",    width = 0.28 },
		{ label = "Ship",      width = 0.18 },
		{ label = "Kills",     width = 0.12 },
		{ label = "Deaths",    width = 0.12 },
		{ label = "Captures",  width = 0.14 },
		{ label = "Score",     width = 0.16 },
	}

	local headerRow           = Instance.new("Frame", panel)
	headerRow.Name            = "HeaderRow"
	headerRow.Size            = UDim2.new(1, 0, 0, 28)
	headerRow.Position        = UDim2.new(0, 0, 0, 36)
	headerRow.BackgroundColor3 = COLOR.header
	headerRow.BackgroundTransparency = 0.25
	headerRow.BorderSizePixel = 0

	local xOffset = 0
	for _, col in ipairs(COLUMNS) do
		textLabel(headerRow, col.label,
			UDim2.new(col.width, 0, 1, 0),
			UDim2.fromScale(xOffset, 0),
			COLOR.textHeader, Enum.Font.GothamBold)
		xOffset = xOffset + col.width
	end

	-- ── Scrolling player list ────────────────────────────────────────────
	local scrollFrame         = Instance.new("ScrollingFrame", panel)
	scrollFrame.Name          = "PlayerList"
	scrollFrame.Position      = UDim2.new(0, 0, 0, 64)
	scrollFrame.Size          = UDim2.new(1, 0, 1, -130)
	scrollFrame.BackgroundTransparency = 1
	scrollFrame.BorderSizePixel = 0
	scrollFrame.ScrollBarThickness = 4
	scrollFrame.CanvasSize    = UDim2.fromScale(1, 0)   -- auto-sized by UIListLayout
	scrollFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y

	local listLayout          = Instance.new("UIListLayout", scrollFrame)
	listLayout.FillDirection  = Enum.FillDirection.Vertical
	listLayout.Padding        = UDim.new(0, 0)

	local function rebuildRows(players)
		-- Clear existing rows
		for _, child in ipairs(scrollFrame:GetChildren()) do
			if child:IsA("Frame") then child:Destroy() end
		end

		for i, player in ipairs(players) do
			local isLocalPlayer = (player.name == LocalPlayer.Name)
			local rowBg = isLocalPlayer and COLOR.rowPlayer
				or (i % 2 == 0 and COLOR.rowEven or COLOR.rowOdd)

			local row             = Instance.new("Frame", scrollFrame)
			row.Name              = "Row_" .. i
			row.Size              = UDim2.new(1, 0, 0, 30)
			row.BackgroundColor3  = rowBg
			row.BackgroundTransparency = isLocalPlayer and 0.1 or 0.3
			row.BorderSizePixel   = 0

			local values = {
				player.name, player.shipType,
				tostring(player.kills), tostring(player.deaths),
				tostring(player.captures), tostring(player.score)
			}
			local xOff = 0
			for colIdx, col in ipairs(COLUMNS) do
				local cell = textLabel(row, values[colIdx],
					UDim2.new(col.width, 0, 1, 0),
					UDim2.fromScale(xOff, 0),
					isLocalPlayer and COLOR.textWhite or COLOR.textGray,
					isLocalPlayer and Enum.Font.GothamBold or Enum.Font.Gotham,
					Enum.TextXAlignment.Center)
				cell.ZIndex = row.ZIndex + 1
				xOff = xOff + col.width
			end
		end
	end

	ScoreboardUpdatedEvent.OnClientEvent:Connect(rebuildRows)

	-- ── Territory summary (bottom of panel) ──────────────────────────────
	local territorySummary    = Instance.new("Frame", panel)
	territorySummary.Name     = "TerritorySummary"
	territorySummary.Size     = UDim2.new(1, 0, 0, 40)
	territorySummary.Position = UDim2.new(0, 0, 1, -40)
	territorySummary.BackgroundColor3 = COLOR.header
	territorySummary.BackgroundTransparency = 0.3
	territorySummary.BorderSizePixel = 0
	Instance.new("UICorner", territorySummary).CornerRadius = UDim.new(0, 10)

	local territoryLabel      = textLabel(territorySummary, "Zones: — captured | — contested | — enemy",
		UDim2.fromScale(1, 1), UDim2.fromScale(0, 0), COLOR.textGray, Enum.Font.Gotham)

	TerritoryUpdatedEvent.OnClientEvent:Connect(function(zones)
		local captured, contested, enemy = 0, 0, 0
		for _, z in ipairs(zones) do
			if z.status == "captured" then captured = captured + 1
			elseif z.status == "contested" then contested = contested + 1
			elseif z.status == "enemy" then enemy = enemy + 1
			end
		end
		local total = #zones
		territoryLabel.Text = string.format(
			"Zones: %d/%d captured  |  %d contested  |  %d enemy",
			captured, total, contested, enemy)
	end)

	-- ── Tab show/hide with fade tween ────────────────────────────────────
	local FADE_TIME = 0.15

	local function setVisible(visible)
		screenGui.Enabled = visible
		local goal = visible and 0 or 1  -- BackgroundTransparency of children? Use group trick
		-- Tween panel transparency
		TweenService:Create(panel, TweenInfo.new(FADE_TIME),
			{ BackgroundTransparency = visible and 0.08 or 1 }):Play()
	end

	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then return end
		if input.KeyCode == Enum.KeyCode.Tab then
			setVisible(true)
		end
	end)

	UserInputService.InputEnded:Connect(function(input, _gameProcessed)
		if input.KeyCode == Enum.KeyCode.Tab then
			setVisible(false)
		end
	end)

	return screenGui
end

-- ─── Module ──────────────────────────────────────────────────────────────────

local Scoreboard = {}

function Scoreboard.init()
	buildGui()
	print("[Scoreboard] Initialized.")
end

return Scoreboard