-- HUD.luau
-- In-game heads-up display: health bar, weapon cooldowns, speed gauge,
-- game-phase banner, and kill feed.  All elements are positioned with
-- UDim2 scale values for cross-resolution support.
-- Listens to RemoteEvents defined in the UI/HUD contract in #93.

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService      = game:GetService("TweenService")

local LocalPlayer = Players.LocalPlayer

-- RemoteEvents (created server-side by GameManager #87 / ShipSystem #88)
local Remotes             = ReplicatedStorage:WaitForChild("Remotes", 10)
local HealthUpdatedEvent  = Remotes:WaitForChild("HealthUpdated", 10)
local CooldownUpdatedEvent= Remotes:WaitForChild("CooldownUpdated", 10)
local SpeedUpdatedEvent   = Remotes:WaitForChild("SpeedUpdated", 10)
local SetGamePhaseEvent   = Remotes:WaitForChild("SetGamePhase", 10)
local KillFeedEvent       = Remotes:WaitForChild("KillFeedEvent", 10)

-- ─── Colour palette ──────────────────────────────────────────────────────────

local COLOR = {
	bgDark      = Color3.fromRGB(10, 10, 20),
	healthGreen = Color3.fromRGB(60, 200, 80),
	healthYellow= Color3.fromRGB(230, 200, 50),
	healthRed   = Color3.fromRGB(220, 60, 60),
	cooldownFill= Color3.fromRGB(80, 160, 255),
	cooldownDim = Color3.fromRGB(30, 50, 80),
	speedFill   = Color3.fromRGB(100, 220, 255),
	textWhite   = Color3.new(1, 1, 1),
	textGray    = Color3.fromRGB(180, 190, 200),
	killFeedBg  = Color3.fromRGB(0, 0, 0),
	phaseBanner = Color3.fromRGB(255, 220, 80),
}

-- ─── Utilities ───────────────────────────────────────────────────────────────

local function lerp3(a, b, t)
	return Color3.new(
		a.R + (b.R - a.R) * t,
		a.G + (b.G - a.G) * t,
		a.B + (b.B - a.B) * t
	)
end

-- Returns health bar fill colour based on fraction (1 = full, 0 = empty)
local function healthColor(fraction)
	if fraction > 0.6 then
		return lerp3(COLOR.healthYellow, COLOR.healthGreen, (fraction - 0.6) / 0.4)
	elseif fraction > 0.3 then
		return lerp3(COLOR.healthRed, COLOR.healthYellow, (fraction - 0.3) / 0.3)
	else
		return COLOR.healthRed
	end
end

local function panel(parent, name, size, pos, transparency)
	local f               = Instance.new("Frame", parent)
	f.Name                = name
	f.Size                = size
	f.Position            = pos
	f.BackgroundColor3    = COLOR.bgDark
	f.BackgroundTransparency = transparency or 0.35
	f.BorderSizePixel     = 0
	Instance.new("UICorner", f).CornerRadius = UDim.new(0, 6)
	return f
end

-- ─── Build GUI ───────────────────────────────────────────────────────────────

local function buildGui()
	local playerGui = LocalPlayer:WaitForChild("PlayerGui")

	local screenGui           = Instance.new("ScreenGui", playerGui)
	screenGui.Name            = "HUDGui"
	screenGui.ResetOnSpawn    = false
	screenGui.IgnoreGuiInset  = true
	screenGui.DisplayOrder    = 3
	screenGui.Enabled         = false  -- shown when game phase is active

	-- ── Health bar (bottom-left) ─────────────────────────────────────────
	local healthPanel         = panel(screenGui, "HealthPanel",
		UDim2.new(0.22, 0, 0.06, 0), UDim2.new(0.01, 0, 0.90, 0))

	local healthBg            = Instance.new("Frame", healthPanel)
	healthBg.Name             = "HealthBg"
	healthBg.Size             = UDim2.new(0.85, 0, 0.45, 0)
	healthBg.Position         = UDim2.new(0.075, 0, 0.45, 0)
	healthBg.BackgroundColor3 = Color3.fromRGB(20, 20, 30)
	healthBg.BorderSizePixel  = 0
	Instance.new("UICorner", healthBg).CornerRadius = UDim.new(1, 0)

	local healthFill          = Instance.new("Frame", healthBg)
	healthFill.Name           = "HealthFill"
	healthFill.Size           = UDim2.fromScale(1, 1)
	healthFill.BackgroundColor3 = COLOR.healthGreen
	healthFill.BorderSizePixel = 0
	Instance.new("UICorner", healthFill).CornerRadius = UDim.new(1, 0)

	local healthLabel         = Instance.new("TextLabel", healthPanel)
	healthLabel.Name          = "HealthLabel"
	healthLabel.Size          = UDim2.fromScale(1, 0.45)
	healthLabel.Position      = UDim2.fromScale(0, 0)
	healthLabel.BackgroundTransparency = 1
	healthLabel.Text          = "500/500 HP"
	healthLabel.TextColor3    = COLOR.textWhite
	healthLabel.TextScaled    = true
	healthLabel.Font          = Enum.Font.GothamBold
	healthLabel.TextXAlignment = Enum.TextXAlignment.Center
	Instance.new("UITextSizeConstraint", healthLabel).MaxTextSize = 16

	HealthUpdatedEvent.OnClientEvent:Connect(function(current, max)
		local fraction = math.clamp(current / math.max(max, 1), 0, 1)
		TweenService:Create(healthFill, TweenInfo.new(0.15),
			{ Size = UDim2.fromScale(fraction, 1), BackgroundColor3 = healthColor(fraction) }):Play()
		healthLabel.Text = current .. "/" .. max .. " HP"
	end)

	-- ── Weapon cooldowns (bottom-center) ─────────────────────────────────
	local cooldownPanel       = panel(screenGui, "CooldownPanel",
		UDim2.new(0.12, 0, 0.10, 0), UDim2.new(0.44, 0, 0.87, 0))
	local cooldownLayout      = Instance.new("UIListLayout", cooldownPanel)
	cooldownLayout.FillDirection = Enum.FillDirection.Horizontal
	cooldownLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	cooldownLayout.VerticalAlignment   = Enum.VerticalAlignment.Center
	cooldownLayout.Padding    = UDim.new(0, 8)

	-- Two weapon slots: primary and special
	local cooldownSlots = {}
	for _, weaponId in ipairs({ "primary", "special" }) do
		local slot            = Instance.new("Frame", cooldownPanel)
		slot.Name             = weaponId .. "Slot"
		slot.Size             = UDim2.new(0, 50, 0, 50)
		slot.BackgroundColor3 = COLOR.cooldownDim
		slot.BorderSizePixel  = 0
		Instance.new("UICorner", slot).CornerRadius = UDim.new(0, 6)
		Instance.new("UISizeConstraint", slot).MaxSize = Vector2.new(60, 60)

		local fill            = Instance.new("Frame", slot)
		fill.Name             = "CooldownFill"
		fill.Size             = UDim2.fromScale(1, 1)   -- full = ready
		fill.AnchorPoint      = Vector2.new(0, 1)
		fill.Position         = UDim2.fromScale(0, 1)
		fill.BackgroundColor3 = COLOR.cooldownFill
		fill.BorderSizePixel  = 0
		Instance.new("UICorner", fill).CornerRadius = UDim.new(0, 6)

		local lbl             = Instance.new("TextLabel", slot)
		lbl.Name              = "Label"
		lbl.Size              = UDim2.fromScale(1, 1)
		lbl.BackgroundTransparency = 1
		lbl.Text              = weaponId == "primary" and "PRI" or "SPC"
		lbl.TextColor3        = COLOR.textWhite
		lbl.TextScaled        = true
		lbl.Font              = Enum.Font.GothamBold
		lbl.ZIndex            = fill.ZIndex + 1
		Instance.new("UITextSizeConstraint", lbl).MaxTextSize = 14

		cooldownSlots[weaponId] = fill
	end

	CooldownUpdatedEvent.OnClientEvent:Connect(function(weaponId, remaining, total)
		local fill = cooldownSlots[weaponId]
		if not fill then return end
		local fraction = math.clamp(1 - (remaining / math.max(total, 0.001)), 0, 1)
		TweenService:Create(fill, TweenInfo.new(0.1),
			{ Size = UDim2.new(1, 0, fraction, 0) }):Play()
	end)

	-- ── Speed indicator (bottom-right) ───────────────────────────────────
	local speedPanel          = panel(screenGui, "SpeedPanel",
		UDim2.new(0.06, 0, 0.15, 0), UDim2.new(0.93, 0, 0.82, 0))

	local speedBg             = Instance.new("Frame", speedPanel)
	speedBg.Name              = "SpeedBg"
	speedBg.Size              = UDim2.new(0.4, 0, 0.80, 0)
	speedBg.Position          = UDim2.new(0.3, 0, 0.08, 0)
	speedBg.BackgroundColor3  = Color3.fromRGB(20, 20, 30)
	speedBg.BorderSizePixel   = 0
	Instance.new("UICorner", speedBg).CornerRadius = UDim.new(0, 4)

	local speedFill           = Instance.new("Frame", speedBg)
	speedFill.Name            = "SpeedFill"
	speedFill.Size            = UDim2.fromScale(1, 0)  -- grows upward
	speedFill.AnchorPoint     = Vector2.new(0, 1)
	speedFill.Position        = UDim2.fromScale(0, 1)
	speedFill.BackgroundColor3 = COLOR.speedFill
	speedFill.BorderSizePixel  = 0
	Instance.new("UICorner", speedFill).CornerRadius = UDim.new(0, 4)

	local speedPct            = Instance.new("TextLabel", speedPanel)
	speedPct.Name             = "SpeedPct"
	speedPct.Size             = UDim2.fromScale(1, 0.18)
	speedPct.Position         = UDim2.fromScale(0, 0.84)
	speedPct.BackgroundTransparency = 1
	speedPct.Text             = "0%"
	speedPct.TextColor3       = COLOR.textWhite
	speedPct.TextScaled       = true
	speedPct.Font             = Enum.Font.GothamBold
	Instance.new("UITextSizeConstraint", speedPct).MaxTextSize = 14

	SpeedUpdatedEvent.OnClientEvent:Connect(function(throttlePct)
		local fraction = math.clamp(throttlePct / 100, 0, 1)
		TweenService:Create(speedFill, TweenInfo.new(0.2),
			{ Size = UDim2.new(1, 0, fraction, 0) }):Play()
		speedPct.Text = math.floor(throttlePct) .. "%"
	end)

	-- ── Game phase banner (top-center) ───────────────────────────────────
	local phaseBanner         = Instance.new("TextLabel", screenGui)
	phaseBanner.Name          = "PhaseBanner"
	phaseBanner.Size          = UDim2.new(0.50, 0, 0.07, 0)
	phaseBanner.Position      = UDim2.new(0.25, 0, 0.02, 0)
	phaseBanner.BackgroundTransparency = 1
	phaseBanner.Text          = ""
	phaseBanner.TextColor3    = COLOR.phaseBanner
	phaseBanner.TextScaled    = true
	phaseBanner.Font          = Enum.Font.GothamBold
	phaseBanner.TextTransparency = 1  -- starts invisible
	Instance.new("UITextSizeConstraint", phaseBanner).MaxTextSize = 32

	SetGamePhaseEvent.OnClientEvent:Connect(function(phaseName)
		-- Only show HUD during gameplay phases (not Deploying, not Lobby)
		local showHUD = (phaseName ~= "Deploying" and phaseName ~= "Lobby")
		screenGui.Enabled = showHUD

		-- Animate banner: fade out current, swap text, fade in
		TweenService:Create(phaseBanner, TweenInfo.new(0.2),
			{ TextTransparency = 1 }):Play()
		task.delay(0.2, function()
			phaseBanner.Text = phaseName
			TweenService:Create(phaseBanner, TweenInfo.new(0.3),
				{ TextTransparency = 0 }):Play()
			-- Auto-fade banner after 3 seconds
			task.delay(3, function()
				TweenService:Create(phaseBanner, TweenInfo.new(0.5),
					{ TextTransparency = 1 }):Play()
			end)
		end)
	end)

	-- ── Kill feed (top-left) ─────────────────────────────────────────────
	local KILLFEED_MAX = 5
	local KILLFEED_LIFE = 5   -- seconds before an entry fades out

	local killFeedFrame       = Instance.new("Frame", screenGui)
	killFeedFrame.Name        = "KillFeed"
	killFeedFrame.Size        = UDim2.new(0.28, 0, 0.25, 0)
	killFeedFrame.Position    = UDim2.new(0.01, 0, 0.04, 0)
	killFeedFrame.BackgroundTransparency = 1
	killFeedFrame.BorderSizePixel = 0

	local feedLayout          = Instance.new("UIListLayout", killFeedFrame)
	feedLayout.FillDirection  = Enum.FillDirection.Vertical
	feedLayout.VerticalAlignment = Enum.VerticalAlignment.Bottom
	feedLayout.Padding        = UDim.new(0, 4)

	local feedEntries = {}

	KillFeedEvent.OnClientEvent:Connect(function(message)
		-- Remove oldest entry if at capacity
		if #feedEntries >= KILLFEED_MAX then
			local oldest = table.remove(feedEntries, 1)
			oldest:Destroy()
		end

		local entry               = Instance.new("Frame", killFeedFrame)
		entry.Name                = "KillFeedEntry"
		entry.Size                = UDim2.new(1, 0, 0, 22)
		entry.BackgroundColor3    = COLOR.killFeedBg
		entry.BackgroundTransparency = 0.45
		entry.BorderSizePixel     = 0
		Instance.new("UICorner", entry).CornerRadius = UDim.new(0, 4)

		local lbl                 = Instance.new("TextLabel", entry)
		lbl.Size                  = UDim2.new(1, -8, 1, 0)
		lbl.Position              = UDim2.fromOffset(4, 0)
		lbl.BackgroundTransparency = 1
		lbl.Text                  = message
		lbl.TextColor3            = COLOR.textWhite
		lbl.TextScaled            = true
		lbl.Font                  = Enum.Font.Gotham
		lbl.TextXAlignment        = Enum.TextXAlignment.Left
		Instance.new("UITextSizeConstraint", lbl).MaxTextSize = 14

		table.insert(feedEntries, entry)

		-- Fade out after KILLFEED_LIFE seconds, then destroy
		task.delay(KILLFEED_LIFE, function()
			if entry and entry.Parent then
				TweenService:Create(entry, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
				TweenService:Create(lbl,   TweenInfo.new(0.5), { TextTransparency = 1 }):Play()
				task.delay(0.5, function()
					local idx = table.find(feedEntries, entry)
					if idx then table.remove(feedEntries, idx) end
					entry:Destroy()
				end)
			end
		end)
	end)

	return screenGui
end

-- ─── Module ──────────────────────────────────────────────────────────────────

local HUD = {}

function HUD.init()
	buildGui()
	print("[HUD] Initialized.")
end

return HUD