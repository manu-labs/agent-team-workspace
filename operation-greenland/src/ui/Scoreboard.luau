-- Scoreboard.luau
-- Tab-hold scoreboard overlay: player stats table, territory summary, game timer.
-- ScoreUpdate fires per-player (userId, score) — cached client-side.
-- ScoreboardUpdated is NOT a real event; this module reconstructs the table
-- from cached per-player scores when the scoreboard is opened.

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService  = game:GetService("UserInputService")
local TweenService      = game:GetService("TweenService")

local LocalPlayer = Players.LocalPlayer

local Remotes                = ReplicatedStorage:WaitForChild("Remotes", 10)
local ScoreUpdateEvent       = Remotes and Remotes:WaitForChild("ScoreUpdate", 10)
local GameTimerUpdatedEvent  = Remotes and Remotes:WaitForChild("GameTimerUpdated", 10)
local TerritoryUpdateEvent   = Remotes and Remotes:WaitForChild("TerritoryUpdate", 10)
local GameStateChangedEvent  = Remotes and Remotes:WaitForChild("GameStateChanged", 10)

-- ─── Score cache ─────────────────────────────────────────────────────────────
-- { [userId: number] -> { name: string, score: number } }
local scoreCache = {}

-- ─── Colors ──────────────────────────────────────────────────────────────────

local COLOR = {
	bg         = Color3.fromRGB(8, 15, 30),
	header     = Color3.fromRGB(15, 30, 55),
	rowEven    = Color3.fromRGB(12, 22, 40),
	rowOdd     = Color3.fromRGB(18, 32, 55),
	rowPlayer  = Color3.fromRGB(20, 50, 90),
	border     = Color3.fromRGB(60, 100, 170),
	textWhite  = Color3.new(1, 1, 1),
	textGray   = Color3.fromRGB(170, 185, 205),
	textHeader = Color3.fromRGB(140, 200, 255),
}

local function formatTime(s)
	return string.format("%02d:%02d", math.floor(s / 60), math.floor(s % 60))
end

local function makeTextLabel(parent, text, size, pos, color, font, xAlign)
	local lbl = Instance.new("TextLabel")
	lbl.Size               = size
	lbl.Position           = pos or UDim2.fromScale(0, 0)
	lbl.BackgroundTransparency = 1
	lbl.Text               = text
	lbl.TextColor3         = color or COLOR.textWhite
	lbl.TextScaled         = true
	lbl.Font               = font or Enum.Font.Gotham
	lbl.TextXAlignment     = xAlign or Enum.TextXAlignment.Center
	lbl.Parent             = parent
	Instance.new("UITextSizeConstraint", lbl).MaxTextSize = 16
	return lbl
end

local COLUMNS = {
	{ label = "Player",   width = 0.35 },
	{ label = "Score",    width = 0.25 },
	{ label = "Rank",     width = 0.20 },
	{ label = "Status",   width = 0.20 },
}

local function buildGui()
	local playerGui = LocalPlayer:WaitForChild("PlayerGui")

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name           = "ScoreboardGui"
	screenGui.ResetOnSpawn   = false
	screenGui.IgnoreGuiInset = true
	screenGui.DisplayOrder   = 8
	screenGui.Enabled        = false
	screenGui.Parent         = playerGui

	local panel = Instance.new("Frame")
	panel.Name              = "Panel"
	panel.AnchorPoint       = Vector2.new(0.5, 0.5)
	panel.Position          = UDim2.fromScale(0.5, 0.5)
	panel.Size              = UDim2.fromScale(0.65, 0.60)
	panel.BackgroundColor3  = COLOR.bg
	panel.BackgroundTransparency = 0.08
	panel.BorderSizePixel   = 0
	panel.Parent            = screenGui
	Instance.new("UICorner", panel).CornerRadius = UDim.new(0, 10)
	local stroke = Instance.new("UIStroke")
	stroke.Color     = COLOR.border
	stroke.Thickness = 1.5
	stroke.Parent    = panel

	-- Timer bar
	local timerBar = Instance.new("Frame")
	timerBar.Size              = UDim2.new(1, 0, 0, 36)
	timerBar.BackgroundColor3  = COLOR.header
	timerBar.BackgroundTransparency = 0.2
	timerBar.BorderSizePixel   = 0
	timerBar.Parent            = panel
	Instance.new("UICorner", timerBar).CornerRadius = UDim.new(0, 10)

	local timerLabel = makeTextLabel(timerBar, "Round Time: --:--",
		UDim2.fromScale(1, 1), nil, COLOR.textHeader, Enum.Font.GothamBold)

	if GameTimerUpdatedEvent then
		GameTimerUpdatedEvent.OnClientEvent:Connect(function(secs)
			timerLabel.Text = "Round Time: " .. formatTime(secs)
		end)
	end

	-- Header row
	local headerRow = Instance.new("Frame")
	headerRow.Size             = UDim2.new(1, 0, 0, 28)
	headerRow.Position         = UDim2.new(0, 0, 0, 36)
	headerRow.BackgroundColor3 = COLOR.header
	headerRow.BackgroundTransparency = 0.25
	headerRow.BorderSizePixel  = 0
	headerRow.Parent           = panel

	local xOff = 0
	for _, col in ipairs(COLUMNS) do
		makeTextLabel(headerRow, col.label, UDim2.new(col.width, 0, 1, 0),
			UDim2.fromScale(xOff, 0), COLOR.textHeader, Enum.Font.GothamBold)
		xOff = xOff + col.width
	end

	-- Scrolling player list
	local scrollFrame = Instance.new("ScrollingFrame")
	scrollFrame.Position           = UDim2.new(0, 0, 0, 64)
	scrollFrame.Size               = UDim2.new(1, 0, 1, -110)
	scrollFrame.BackgroundTransparency = 1
	scrollFrame.BorderSizePixel    = 0
	scrollFrame.ScrollBarThickness = 4
	scrollFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y
	scrollFrame.CanvasSize         = UDim2.fromScale(1, 0)
	scrollFrame.Parent             = panel

	local listLayout = Instance.new("UIListLayout")
	listLayout.FillDirection  = Enum.FillDirection.Vertical
	listLayout.Padding        = UDim.new(0, 0)
	listLayout.Parent         = scrollFrame

	local function rebuildRows()
		for _, child in ipairs(scrollFrame:GetChildren()) do
			if child:IsA("Frame") then child:Destroy() end
		end
		-- Sort by score descending
		local sorted = {}
		for userId, data in pairs(scoreCache) do
			table.insert(sorted, { userId = userId, name = data.name, score = data.score })
		end
		table.sort(sorted, function(a, b) return a.score > b.score end)

		for i, entry in ipairs(sorted) do
			local isLocal = (entry.userId == LocalPlayer.UserId)
			local bgColor = isLocal and COLOR.rowPlayer
				or (i % 2 == 0 and COLOR.rowEven or COLOR.rowOdd)

			local row = Instance.new("Frame")
			row.Size              = UDim2.new(1, 0, 0, 30)
			row.BackgroundColor3  = bgColor
			row.BackgroundTransparency = isLocal and 0.1 or 0.3
			row.BorderSizePixel   = 0
			row.Parent            = scrollFrame

			local values = { entry.name, tostring(entry.score), "#" .. i, isLocal and "You" or "" }
			local xO = 0
			for ci, col in ipairs(COLUMNS) do
				makeTextLabel(row, values[ci],
					UDim2.new(col.width, 0, 1, 0), UDim2.fromScale(xO, 0),
					isLocal and COLOR.textWhite or COLOR.textGray,
					isLocal and Enum.Font.GothamBold or Enum.Font.Gotham)
				xO = xO + col.width
			end
		end
	end

	-- Cache incoming per-player score updates
	if ScoreUpdateEvent then
		ScoreUpdateEvent.OnClientEvent:Connect(function(userId, score)
			local player = Players:GetPlayerByUserId(userId)
			local name = player and player.DisplayName or ("Player_" .. userId)
			scoreCache[userId] = { name = name, score = score }
			-- Rebuild if scoreboard is currently visible
			if screenGui.Enabled then rebuildRows() end
		end)
	end

	-- Territory summary (bottom)
	local territorySummary = Instance.new("Frame")
	territorySummary.Size              = UDim2.new(1, 0, 0, 36)
	territorySummary.Position          = UDim2.new(0, 0, 1, -36)
	territorySummary.BackgroundColor3  = COLOR.header
	territorySummary.BackgroundTransparency = 0.3
	territorySummary.BorderSizePixel   = 0
	territorySummary.Parent            = panel
	Instance.new("UICorner", territorySummary).CornerRadius = UDim.new(0, 10)

	local territoryLabel = makeTextLabel(territorySummary,
		"Zones: — captured | — contested | — enemy",
		UDim2.fromScale(1, 1), nil, COLOR.textGray)

	if TerritoryUpdateEvent then
		TerritoryUpdateEvent.OnClientEvent:Connect(function(zones)
			local cap, con, ene = 0, 0, 0
			for _, z in ipairs(zones) do
				if z.status == "captured" then cap = cap + 1
				elseif z.status == "contested" then con = con + 1
				elseif z.status == "enemy" then ene = ene + 1 end
			end
			territoryLabel.Text = string.format(
				"Zones: %d/%d captured  |  %d contested  |  %d enemy", cap, #zones, con, ene)
		end)
	end

	-- Show/hide on Tab; rebuild rows when opening
	local FADE = 0.15
	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then return end
		if input.KeyCode == Enum.KeyCode.Tab then
			screenGui.Enabled = true
			rebuildRows()
			TweenService:Create(panel, TweenInfo.new(FADE), { BackgroundTransparency = 0.08 }):Play()
		end
	end)
	UserInputService.InputEnded:Connect(function(input, _gp)
		if input.KeyCode == Enum.KeyCode.Tab then
			TweenService:Create(panel, TweenInfo.new(FADE), { BackgroundTransparency = 1 }):Play()
			task.delay(FADE, function() screenGui.Enabled = false end)
		end
	end)

	-- Hide scoreboard when not in an active gameplay state
	if GameStateChangedEvent then
		GameStateChangedEvent.OnClientEvent:Connect(function(newState, _old)
			local inGame = (newState == "Combat" or newState == "Sailing")
			if not inGame then screenGui.Enabled = false end
		end)
	end
end

local Scoreboard = {}
function Scoreboard.init()
	buildGui()
	print("[Scoreboard] Initialized.")
end
return Scoreboard