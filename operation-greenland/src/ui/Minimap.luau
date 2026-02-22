-- Minimap.luau
-- Top-right minimap widget: ship positions, territory zones, north indicator.
-- Ships payload from MinimapUpdated: {{userId: number, x: number, z: number}}
-- Zones payload from TerritoryUpdate: {{id: string, status: string, position: {x,z}}}

local Players           = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local LocalPlayer = Players.LocalPlayer

local Remotes               = ReplicatedStorage:WaitForChild("Remotes", 10)
local TerritoryUpdateEvent  = Remotes and Remotes:WaitForChild("TerritoryUpdate", 10)
local MinimapUpdatedEvent   = Remotes and Remotes:WaitForChild("MinimapUpdated", 10)

-- ─── Config ──────────────────────────────────────────────────────────────────
-- TODO: import MAP_BOUNDS from GameConfig (#86) once merged.
local MAP_BOUNDS = { min = Vector2.new(-500, -500), max = Vector2.new(500, 500) }
local MINIMAP_PX = 200

local ZONE_COLORS = {
	captured  = Color3.fromRGB(60, 120, 220),
	enemy     = Color3.fromRGB(200, 60, 60),
	contested = Color3.fromRGB(220, 180, 40),
	neutral   = Color3.fromRGB(100, 100, 100),
}

-- ─── Coord mapping ───────────────────────────────────────────────────────────
-- Accepts world X/Z (as separate numbers) and returns a UDim2 scale position.
local function worldToMinimap(wx, wz)
	local nx = (wx - MAP_BOUNDS.min.X) / (MAP_BOUNDS.max.X - MAP_BOUNDS.min.X)
	local nz = (wz - MAP_BOUNDS.min.Y) / (MAP_BOUNDS.max.Y - MAP_BOUNDS.min.Y)
	return UDim2.fromScale(math.clamp(nx, 0, 1), math.clamp(nz, 0, 1))
end

-- ─── Build GUI ───────────────────────────────────────────────────────────────

local function buildGui()
	local playerGui = LocalPlayer:WaitForChild("PlayerGui")

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name            = "MinimapGui"
	screenGui.ResetOnSpawn    = false
	screenGui.IgnoreGuiInset  = true
	screenGui.DisplayOrder    = 4
	screenGui.Parent          = playerGui

	local container = Instance.new("Frame")
	container.Name              = "MinimapContainer"
	container.AnchorPoint       = Vector2.new(1, 0)
	container.Position          = UDim2.new(1, -10, 0, 10)
	container.Size              = UDim2.fromOffset(MINIMAP_PX, MINIMAP_PX)
	container.BackgroundColor3  = Color3.fromRGB(5, 15, 30)
	container.BackgroundTransparency = 0.3
	container.BorderSizePixel   = 0
	container.Parent            = screenGui

	local sc = Instance.new("UISizeConstraint")
	sc.MinSize = Vector2.new(160, 160)
	sc.MaxSize = Vector2.new(240, 240)
	sc.Parent  = container

	Instance.new("UICorner", container).CornerRadius = UDim.new(0, 8)

	local stroke = Instance.new("UIStroke")
	stroke.Color     = Color3.fromRGB(80, 120, 180)
	stroke.Thickness = 1.5
	stroke.Parent    = container

	-- Greenland outline placeholder
	local greenland = Instance.new("Frame")
	greenland.Size              = UDim2.fromScale(0.30, 0.40)
	greenland.Position          = UDim2.fromScale(0.60, 0.05)
	greenland.BackgroundColor3  = Color3.fromRGB(60, 100, 60)
	greenland.BackgroundTransparency = 0.4
	greenland.BorderSizePixel   = 0
	greenland.ZIndex            = 2
	greenland.Parent            = container
	Instance.new("UICorner", greenland).CornerRadius = UDim.new(0, 6)
	local glLbl = Instance.new("TextLabel")
	glLbl.Size              = UDim2.fromScale(1, 1)
	glLbl.BackgroundTransparency = 1
	glLbl.Text              = "GL"
	glLbl.TextColor3        = Color3.new(1, 1, 1)
	glLbl.TextTransparency  = 0.4
	glLbl.TextScaled        = true
	glLbl.Font              = Enum.Font.GothamBold
	glLbl.Parent            = greenland

	-- Territory zones layer
	local zonesContainer = Instance.new("Frame")
	zonesContainer.Size              = UDim2.fromScale(1, 1)
	zonesContainer.BackgroundTransparency = 1
	zonesContainer.ZIndex            = 3
	zonesContainer.Parent            = container

	local zoneFrames = {}

	if TerritoryUpdateEvent then
		TerritoryUpdateEvent.OnClientEvent:Connect(function(zones)
			-- Remove stale zone frames
			for id, frame in pairs(zoneFrames) do
				local found = false
				for _, z in ipairs(zones) do if z.id == id then found = true; break end end
				if not found then frame:Destroy(); zoneFrames[id] = nil end
			end
			for _, zone in ipairs(zones) do
				local frame = zoneFrames[zone.id]
				if not frame then
					frame = Instance.new("Frame")
					frame.Size          = UDim2.fromOffset(14, 14)
					frame.AnchorPoint   = Vector2.new(0.5, 0.5)
					frame.BorderSizePixel = 0
					frame.ZIndex        = zonesContainer.ZIndex
					frame.Parent        = zonesContainer
					Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 3)
					zoneFrames[zone.id] = frame
				end
				local px, pz = zone.position.x or zone.position.X, zone.position.z or zone.position.Z
				frame.Position      = worldToMinimap(px, pz)
				frame.BackgroundColor3 = ZONE_COLORS[zone.status] or ZONE_COLORS.neutral
			end
		end)
	end

	-- Ships layer
	local shipsContainer = Instance.new("Frame")
	shipsContainer.Size              = UDim2.fromScale(1, 1)
	shipsContainer.BackgroundTransparency = 1
	shipsContainer.ZIndex            = 4
	shipsContainer.Parent            = container

	if MinimapUpdatedEvent then
		MinimapUpdatedEvent.OnClientEvent:Connect(function(ships)
			for _, child in ipairs(shipsContainer:GetChildren()) do
				child:Destroy()
			end
			local localUserId = LocalPlayer.UserId
			for _, ship in ipairs(ships) do
				local isPlayer = (ship.userId == localUserId)
				local dot = Instance.new("Frame")
				dot.AnchorPoint     = Vector2.new(0.5, 0.5)
				dot.BorderSizePixel = 0
				dot.ZIndex          = shipsContainer.ZIndex
				if isPlayer then
					dot.Size            = UDim2.fromOffset(10, 10)
					dot.BackgroundColor3 = Color3.new(1, 1, 1)
					local ps = Instance.new("UIStroke")
					ps.Color     = Color3.fromRGB(100, 200, 255)
					ps.Thickness = 2
					ps.Parent    = dot
				else
					dot.Size            = UDim2.fromOffset(6, 6)
					dot.BackgroundColor3 = Color3.fromRGB(80, 140, 255)
				end
				Instance.new("UICorner", dot).CornerRadius = UDim.new(1, 0)
				dot.Position = worldToMinimap(ship.x, ship.z)
				dot.Parent   = shipsContainer
			end
		end)
	end

	-- North indicator
	local northLabel = Instance.new("TextLabel")
	northLabel.Name             = "NorthArrow"
	northLabel.Size             = UDim2.fromOffset(18, 18)
	northLabel.Position         = UDim2.new(0.5, -9, 0, 4)
	northLabel.BackgroundTransparency = 1
	northLabel.Text             = "N"
	northLabel.TextColor3       = Color3.new(1, 1, 1)
	northLabel.TextScaled       = true
	northLabel.Font             = Enum.Font.GothamBold
	northLabel.ZIndex           = 5
	northLabel.Parent           = container
	Instance.new("UITextSizeConstraint", northLabel).MaxTextSize = 14
end

local Minimap = {}
function Minimap.init()
	buildGui()
	print("[Minimap] Initialized.")
end
return Minimap