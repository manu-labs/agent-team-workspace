-- VictoryDefeatScreen.luau
-- Full-screen end-of-round overlay.
-- Primary trigger: GameStateChanged (newState == 'Victory' or 'Defeat').
-- Stats populated by RoundEnded, which sends an ARRAY of all players' stats.
-- We find the local player's entry by matching userId.
-- Hidden on GameStateChanged newState == 'Lobby'.
-- PlayAgain button fires PlayAgain RemoteEvent.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local LocalPlayer = Players.LocalPlayer

local Remotes = ReplicatedStorage:WaitForChild("Remotes", 10)
local GameStateChangedEvent = Remotes and Remotes:WaitForChild("GameStateChanged", 10)
local RoundEndedEvent = Remotes and Remotes:WaitForChild("RoundEnded", 10)
local PlayAgainEvent = Remotes and Remotes:WaitForChild("PlayAgain", 10)

local COLOR = {
	bg = Color3.fromRGB(5, 10, 20),
	victoryTitle = Color3.fromRGB(80, 230, 100),
	defeatTitle = Color3.fromRGB(230, 70, 70),
	statLabel = Color3.fromRGB(160, 185, 210),
	statValue = Color3.new(1, 1, 1),
	playAgainNorm = Color3.fromRGB(40, 160, 70),
	playAgainHov = Color3.fromRGB(60, 210, 90),
	panel = Color3.fromRGB(12, 22, 42),
}

local function statRow(parent, label, value, order)
	local row = Instance.new("Frame")
	row.Size = UDim2.new(1, 0, 0, 30)
	row.BackgroundTransparency = 1
	row.LayoutOrder = order
	row.Parent = parent

	local lbl = Instance.new("TextLabel")
	lbl.Size = UDim2.fromScale(0.6, 1)
	lbl.BackgroundTransparency = 1
	lbl.Text = label
	lbl.TextColor3 = COLOR.statLabel
	lbl.TextScaled = true
	lbl.Font = Enum.Font.Gotham
	lbl.TextXAlignment = Enum.TextXAlignment.Left
	lbl.Parent = row
	Instance.new("UITextSizeConstraint", lbl).MaxTextSize = 18

	local val = Instance.new("TextLabel")
	val.Name = "Value"
	val.Size = UDim2.fromScale(0.4, 1)
	val.Position = UDim2.fromScale(0.6, 0)
	val.BackgroundTransparency = 1
	val.Text = tostring(value)
	val.TextColor3 = COLOR.statValue
	val.TextScaled = true
	val.Font = Enum.Font.GothamBold
	val.TextXAlignment = Enum.TextXAlignment.Right
	val.Parent = row
	Instance.new("UITextSizeConstraint", val).MaxTextSize = 18

	return val
end

local function buildGui()
	local playerGui = LocalPlayer:WaitForChild("PlayerGui")

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "VictoryDefeatGui"
	screenGui.ResetOnSpawn = false
	screenGui.IgnoreGuiInset = true
	screenGui.DisplayOrder = 20
	screenGui.Enabled = false
	screenGui.Parent = playerGui

	local overlay = Instance.new("Frame")
	overlay.Size = UDim2.fromScale(1, 1)
	overlay.BackgroundColor3 = COLOR.bg
	overlay.BackgroundTransparency = 0.35
	overlay.BorderSizePixel = 0
	overlay.Parent = screenGui

	local contentPanel = Instance.new("Frame")
	contentPanel.Name = "ContentPanel"
	contentPanel.AnchorPoint = Vector2.new(0.5, 0.5)
	contentPanel.Position = UDim2.fromScale(0.5, 0.5)
	contentPanel.Size = UDim2.fromScale(0.50, 0.72)
	contentPanel.BackgroundColor3 = COLOR.panel
	contentPanel.BackgroundTransparency = 0.10
	contentPanel.BorderSizePixel = 0
	contentPanel.Parent = overlay
	Instance.new("UICorner", contentPanel).CornerRadius = UDim.new(0, 14)
	Instance.new("UIStroke", contentPanel).Color = Color3.fromRGB(60, 90, 140)

	local contentLayout = Instance.new("UIListLayout")
	contentLayout.FillDirection = Enum.FillDirection.Vertical
	contentLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	contentLayout.Padding = UDim.new(0, 10)
	contentLayout.Parent = contentPanel

	local pad = Instance.new("UIPadding")
	pad.PaddingTop = UDim.new(0, 24)
	pad.PaddingBottom = UDim.new(0, 24)
	pad.PaddingLeft = UDim.new(0, 32)
	pad.PaddingRight = UDim.new(0, 32)
	pad.Parent = contentPanel

	local titleLabel = Instance.new("TextLabel")
	titleLabel.Name = "Title"
	titleLabel.Size = UDim2.new(1, 0, 0, 64)
	titleLabel.BackgroundTransparency = 1
	titleLabel.Text = ""
	titleLabel.TextScaled = true
	titleLabel.Font = Enum.Font.GothamBlack
	titleLabel.LayoutOrder = 1
	titleLabel.Parent = contentPanel
	Instance.new("UITextSizeConstraint", titleLabel).MaxTextSize = 46

	local div1 = Instance.new("Frame")
	div1.Size = UDim2.new(0.9, 0, 0, 2)
	div1.BackgroundColor3 = Color3.fromRGB(60, 90, 140)
	div1.BackgroundTransparency = 0.3
	div1.BorderSizePixel = 0
	div1.LayoutOrder = 2
	div1.Parent = contentPanel

	local statsSection = Instance.new("Frame")
	statsSection.Size = UDim2.new(1, 0, 0, 160)
	statsSection.BackgroundTransparency = 1
	statsSection.LayoutOrder = 3
	statsSection.Parent = contentPanel

	local statsLayout = Instance.new("UIListLayout")
	statsLayout.FillDirection = Enum.FillDirection.Vertical
	statsLayout.Padding = UDim.new(0, 4)
	statsLayout.Parent = statsSection

	local statsHeader = Instance.new("TextLabel")
	statsHeader.Size = UDim2.new(1, 0, 0, 24)
	statsHeader.BackgroundTransparency = 1
	statsHeader.Text = "Your Performance"
	statsHeader.TextColor3 = Color3.fromRGB(140, 180, 220)
	statsHeader.TextScaled = true
	statsHeader.Font = Enum.Font.GothamBold
	statsHeader.TextXAlignment = Enum.TextXAlignment.Left
	statsHeader.LayoutOrder = 0
	statsHeader.Parent = statsSection
	Instance.new("UITextSizeConstraint", statsHeader).MaxTextSize = 16

	local killsVal = statRow(statsSection, "Kills", "—", 1)
	local deathsVal = statRow(statsSection, "Deaths", "—", 2)
	local capVal = statRow(statsSection, "Territories Captured", "—", 3)
	local scoreVal = statRow(statsSection, "Score", "—", 4)

	local div2 = Instance.new("Frame")
	div2.Size = UDim2.new(0.9, 0, 0, 2)
	div2.BackgroundColor3 = Color3.fromRGB(60, 90, 140)
	div2.BackgroundTransparency = 0.3
	div2.BorderSizePixel = 0
	div2.LayoutOrder = 4
	div2.Parent = contentPanel

	local teamSection = Instance.new("Frame")
	teamSection.Size = UDim2.new(1, 0, 0, 70)
	teamSection.BackgroundTransparency = 1
	teamSection.LayoutOrder = 5
	teamSection.Parent = contentPanel

	local teamLayout = Instance.new("UIListLayout")
	teamLayout.FillDirection = Enum.FillDirection.Vertical
	teamLayout.Padding = UDim.new(0, 4)
	teamLayout.Parent = teamSection

	local teamHeader = Instance.new("TextLabel")
	teamHeader.Size = UDim2.new(1, 0, 0, 24)
	teamHeader.BackgroundTransparency = 1
	teamHeader.Text = "Team Summary"
	teamHeader.TextColor3 = Color3.fromRGB(140, 180, 220)
	teamHeader.TextScaled = true
	teamHeader.Font = Enum.Font.GothamBold
	teamHeader.TextXAlignment = Enum.TextXAlignment.Left
	teamHeader.LayoutOrder = 0
	teamHeader.Parent = teamSection
	Instance.new("UITextSizeConstraint", teamHeader).MaxTextSize = 16

	local zonesVal = statRow(teamSection, "Zones Captured", "—", 1)
	local lossesVal = statRow(teamSection, "Fleet Losses", "—", 2)

	local playAgainBtn = Instance.new("TextButton")
	playAgainBtn.Name = "PlayAgainButton"
	playAgainBtn.Size = UDim2.new(0.55, 0, 0, 50)
	playAgainBtn.BackgroundColor3 = COLOR.playAgainNorm
	playAgainBtn.BorderSizePixel = 0
	playAgainBtn.Text = "Play Again"
	playAgainBtn.TextColor3 = Color3.new(1, 1, 1)
	playAgainBtn.TextScaled = true
	playAgainBtn.Font = Enum.Font.GothamBold
	playAgainBtn.LayoutOrder = 6
	playAgainBtn.Parent = contentPanel
	Instance.new("UICorner", playAgainBtn).CornerRadius = UDim.new(0, 10)
	Instance.new("UITextSizeConstraint", playAgainBtn).MaxTextSize = 22

	playAgainBtn.MouseEnter:Connect(function()
		TweenService:Create(playAgainBtn, TweenInfo.new(0.12), { BackgroundColor3 = COLOR.playAgainHov }):Play()
	end)
	playAgainBtn.MouseLeave:Connect(function()
		TweenService:Create(playAgainBtn, TweenInfo.new(0.12), { BackgroundColor3 = COLOR.playAgainNorm }):Play()
	end)
	playAgainBtn.Activated:Connect(function()
		if PlayAgainEvent then
			PlayAgainEvent:FireServer()
		end
	end)

	-- Populate stat labels from a single player's stats entry
	local function applyStats(myStats)
		killsVal.Text = tostring(myStats.kills or 0)
		deathsVal.Text = tostring(myStats.deaths or 0)
		capVal.Text = tostring(myStats.captures or 0)
		scoreVal.Text = tostring(myStats.score or 0)
		zonesVal.Text = (myStats.zonesCaptured or 0) .. "/" .. (myStats.zonesTotal or 0)
		lossesVal.Text = tostring(myStats.fleetLosses or 0) .. " ships"
	end

	local function showResult(result)
		if result == "Victory" or result == "victory" then
			titleLabel.Text = "GREENLAND CONQUERED"
			titleLabel.TextColor3 = COLOR.victoryTitle
		else
			titleLabel.Text = "MISSION FAILED"
			titleLabel.TextColor3 = COLOR.defeatTitle
		end
		contentPanel.Size = UDim2.fromScale(0.05, 0.05)
		screenGui.Enabled = true
		TweenService:Create(
			contentPanel,
			TweenInfo.new(0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
			{ Size = UDim2.fromScale(0.50, 0.72) }
		):Play()
	end

	-- GameStateChanged: show screen on Victory/Defeat (stats come from RoundEnded below)
	-- Hide on Lobby (new round starting).
	if GameStateChangedEvent then
		GameStateChangedEvent.OnClientEvent:Connect(function(newState, _oldState)
			if newState == "Victory" or newState == "Defeat" then
				showResult(newState)
				-- Stats display left at "—" until RoundEnded fires with real data
			elseif newState == "Lobby" then
				screenGui.Enabled = false
			end
		end)
	end

	-- RoundEnded sends an ARRAY of all players' stats.
	-- Iterate to find the local player's entry by userId.
	if RoundEndedEvent then
		RoundEndedEvent.OnClientEvent:Connect(function(result, allStats)
			showResult(result)
			local myStats = {}
			for _, entry in ipairs(allStats) do
				if entry.userId == LocalPlayer.UserId then
					myStats = entry
					break
				end
			end
			applyStats(myStats)
		end)
	end
end

local VictoryDefeatScreen = {}
function VictoryDefeatScreen.init()
	buildGui()
	print("[VictoryDefeatScreen] Initialized.")
end
return VictoryDefeatScreen