-- Minimap.luau
-- Top-right minimap widget showing the ocean, ship positions, territory zones,
-- and a north-arrow indicator.
-- Listens to TerritoryUpdated and MinimapUpdated RemoteEvents.

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local LocalPlayer = Players.LocalPlayer

-- RemoteEvents
local Remotes               = ReplicatedStorage:WaitForChild("Remotes", 10)
local TerritoryUpdatedEvent = Remotes:WaitForChild("TerritoryUpdated", 10)
local MinimapUpdatedEvent   = Remotes:WaitForChild("MinimapUpdated", 10)

-- ─── Configuration ───────────────────────────────────────────────────────────

-- Map world-space bounds (X/Z plane).
-- TODO: import from GameConfig (#86) once merged.
local MAP_BOUNDS = {
	min = Vector2.new(-500, -500),
	max = Vector2.new( 500,  500),
}

local MINIMAP_SIZE = Vector2.new(200, 200)  -- pixels

local ZONE_COLORS = {
	captured  = Color3.fromRGB(60, 120, 220),   -- blue: player team
	enemy     = Color3.fromRGB(200, 60, 60),     -- red
	contested = Color3.fromRGB(220, 180, 40),    -- yellow
	neutral   = Color3.fromRGB(100, 100, 100),   -- grey
}

-- ─── Coordinate mapping ──────────────────────────────────────────────────────

-- Maps a world-space position (X/Z) to a UDim2 position within the minimap.
-- worldPos can be Vector3 (uses X/Z) or Vector2 (uses X/Y as X/Z).
local function worldToMinimap(worldPos, mapBounds, minimapPx)
	local wx = typeof(worldPos) == "Vector3" and worldPos.X or worldPos.X
	local wz = typeof(worldPos) == "Vector3" and worldPos.Z or worldPos.Y
	local nx = (wx - mapBounds.min.X) / (mapBounds.max.X - mapBounds.min.X)
	local nz = (wz - mapBounds.min.Y) / (mapBounds.max.Y - mapBounds.min.Y)
	-- Clamp to [0,1] so dots don't escape the minimap frame
	nx = math.clamp(nx, 0, 1)
	nz = math.clamp(nz, 0, 1)
	return UDim2.fromScale(nx, nz)
end

-- ─── Build GUI ───────────────────────────────────────────────────────────────

local function buildGui()
	local playerGui = LocalPlayer:WaitForChild("PlayerGui")

	local screenGui           = Instance.new("ScreenGui", playerGui)
	screenGui.Name            = "MinimapGui"
	screenGui.ResetOnSpawn    = false
	screenGui.IgnoreGuiInset  = true
	screenGui.DisplayOrder    = 4

	-- Outer container anchored to top-right
	local container           = Instance.new("Frame", screenGui)
	container.Name            = "MinimapContainer"
	container.AnchorPoint     = Vector2.new(1, 0)
	container.Position        = UDim2.new(1, -10, 0, 10)
	container.BackgroundColor3 = Color3.fromRGB(5, 15, 30)
	container.BackgroundTransparency = 0.3
	container.BorderSizePixel = 0

	-- Fixed pixel size with a size constraint (scales with UIScale if added globally)
	local sizeConstraint      = Instance.new("UISizeConstraint", container)
	sizeConstraint.MinSize    = Vector2.new(160, 160)
	sizeConstraint.MaxSize    = Vector2.new(240, 240)
	container.Size            = UDim2.fromOffset(MINIMAP_SIZE.X, MINIMAP_SIZE.Y)

	Instance.new("UICorner", container).CornerRadius = UDim.new(0, 8)
	local stroke              = Instance.new("UIStroke", container)
	stroke.Color              = Color3.fromRGB(80, 120, 180)
	stroke.Thickness          = 1.5

	-- ── Layer 1: ocean background (already provided by container colour) ──

	-- ── Layer 2: Greenland outline placeholder ────────────────────────────
	-- Simplified as a white-bordered frame until real asset is available.
	-- Positioned roughly in the upper-right quadrant of the minimap.
	local greenland           = Instance.new("Frame", container)
	greenland.Name            = "GreenlandOutline"
	greenland.Size            = UDim2.fromScale(0.30, 0.40)
	greenland.Position        = UDim2.fromScale(0.60, 0.05)
	greenland.BackgroundColor3 = Color3.fromRGB(60, 100, 60)
	greenland.BackgroundTransparency = 0.4
	greenland.BorderSizePixel = 0
	Instance.new("UICorner", greenland).CornerRadius = UDim.new(0, 6)
	local glLabel             = Instance.new("TextLabel", greenland)
	glLabel.Size              = UDim2.fromScale(1, 1)
	glLabel.BackgroundTransparency = 1
	glLabel.Text              = "GL"
	glLabel.TextColor3        = Color3.new(1, 1, 1)
	glLabel.TextTransparency  = 0.4
	glLabel.TextScaled        = true
	glLabel.Font              = Enum.Font.GothamBold

	-- ── Layer 3: territory zones (dynamically updated) ────────────────────
	local zonesContainer      = Instance.new("Frame", container)
	zonesContainer.Name       = "ZonesContainer"
	zonesContainer.Size       = UDim2.fromScale(1, 1)
	zonesContainer.BackgroundTransparency = 1
	zonesContainer.ZIndex     = 2

	local zoneFrames = {}  -- zoneId -> Frame

	local function updateZones(zones)
		-- Clear old zone frames that no longer exist
		for id, frame in pairs(zoneFrames) do
			local found = false
			for _, z in ipairs(zones) do
				if z.id == id then found = true break end
			end
			if not found then
				frame:Destroy()
				zoneFrames[id] = nil
			end
		end

		for _, zone in ipairs(zones) do
			local frame = zoneFrames[zone.id]
			if not frame then
				frame                     = Instance.new("Frame", zonesContainer)
				frame.Name                = "Zone_" .. zone.id
				frame.Size                = UDim2.fromOffset(14, 14)
				frame.AnchorPoint         = Vector2.new(0.5, 0.5)
				frame.BorderSizePixel     = 0
				Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 3)
				zoneFrames[zone.id]       = frame
			end
			frame.Position            = worldToMinimap(zone.position, MAP_BOUNDS, MINIMAP_SIZE)
			frame.BackgroundColor3    = ZONE_COLORS[zone.status] or ZONE_COLORS.neutral
			frame.ZIndex              = zonesContainer.ZIndex
		end
	end

	TerritoryUpdatedEvent.OnClientEvent:Connect(updateZones)

	-- ── Layer 4: ship dots (dynamically updated) ──────────────────────────
	local shipsContainer      = Instance.new("Frame", container)
	shipsContainer.Name       = "ShipsContainer"
	shipsContainer.Size       = UDim2.fromScale(1, 1)
	shipsContainer.BackgroundTransparency = 1
	shipsContainer.ZIndex     = 3

	-- Pool of ship dot frames; recreated each MinimapUpdated tick.
	-- For a low-frequency event (< 10 Hz) this is acceptable.
	MinimapUpdatedEvent.OnClientEvent:Connect(function(ships)
		-- Clear previous dots
		for _, child in ipairs(shipsContainer:GetChildren()) do
			child:Destroy()
		end

		for _, ship in ipairs(ships) do
			local dot             = Instance.new("Frame", shipsContainer)
			dot.AnchorPoint       = Vector2.new(0.5, 0.5)
			dot.BorderSizePixel   = 0
			dot.ZIndex            = shipsContainer.ZIndex

			if ship.isPlayer then
				-- Local player: larger white dot with a distinct border
				dot.Size          = UDim2.fromOffset(10, 10)
				dot.BackgroundColor3 = Color3.new(1, 1, 1)
				local ps          = Instance.new("UIStroke", dot)
				ps.Color          = Color3.fromRGB(100, 200, 255)
				ps.Thickness      = 2
			else
				-- Friendly: smaller blue dot
				dot.Size          = UDim2.fromOffset(6, 6)
				dot.BackgroundColor3 = Color3.fromRGB(80, 140, 255)
			end

			Instance.new("UICorner", dot).CornerRadius = UDim.new(1, 0)
			dot.Position = worldToMinimap(ship.position, MAP_BOUNDS, MINIMAP_SIZE)
		end
	end)

	-- ── North arrow (top of minimap) ──────────────────────────────────────
	local northLabel          = Instance.new("TextLabel", container)
	northLabel.Name           = "NorthArrow"
	northLabel.Size           = UDim2.fromOffset(18, 18)
	northLabel.Position       = UDim2.new(0.5, -9, 0, 4)
	northLabel.BackgroundTransparency = 1
	northLabel.Text           = "N"
	northLabel.TextColor3     = Color3.new(1, 1, 1)
	northLabel.TextScaled     = true
	northLabel.Font           = Enum.Font.GothamBold
	northLabel.ZIndex         = 5
	Instance.new("UITextSizeConstraint", northLabel).MaxTextSize = 14

	return screenGui
end

-- ─── Module ──────────────────────────────────────────────────────────────────

local Minimap = {}

function Minimap.init()
	buildGui()
	print("[Minimap] Initialized.")
end

return Minimap