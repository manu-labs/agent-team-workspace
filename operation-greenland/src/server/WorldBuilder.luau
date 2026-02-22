-- WorldBuilder.luau
-- Programmatic game world generation for Operation Greenland.
-- Builds ocean terrain, Greenland landmass, capture zones, icebergs,
-- shallow water zones, spawn docks, and arctic lighting/atmosphere.
-- Called once at server startup via WorldBuilder.build().

local Lighting = game:GetService("Lighting")

local WorldBuilder = {}

-- ─── Constants ────────────────────────────────────────────────────────────────

local MAP_MIN_X = -5000
local MAP_MAX_X = 5000
local MAP_MIN_Z = -8000
local MAP_MAX_Z = 8000

local CAPTURE_ZONES = {
	{ Name = "Nuuk", Position = Vector3.new(-800, 0, 5500), Radius = 250 },
	{ Name = "Ilulissat", Position = Vector3.new(-1800, 0, 3800), Radius = 220 },
	{ Name = "Kangerlussuaq", Position = Vector3.new(-400, 0, 2200), Radius = 280 },
	{ Name = "Narsarsuaq", Position = Vector3.new(600, 0, 6200), Radius = 200 },
	{ Name = "Thule", Position = Vector3.new(-2600, 0, 1200), Radius = 240 },
}

local SMALL_ICEBERG_POSITIONS = {
	Vector3.new(-2200, 0, -4000),
	Vector3.new(-1900, 0, -3200),
	Vector3.new(-1600, 0, -2100),
	Vector3.new(-300, 0, -2500),
	Vector3.new(1200, 0, -4200),
	Vector3.new(2100, 0, -2200),
	Vector3.new(-1000, 0, -800),
	Vector3.new(400, 0, -500),
}

local MEDIUM_ICEBERG_POSITIONS = {
	Vector3.new(-2500, 0, -2800),
	Vector3.new(-600, 0, -3800),
	Vector3.new(200, 0, -3100),
	Vector3.new(1800, 0, -2900),
	Vector3.new(2400, 0, -1600),
}

local LARGE_ICEBERG_POSITIONS = {
	Vector3.new(-2800, 0, -1500),
	Vector3.new(1500, 0, -3500),
}

local SHALLOW_WATER_ZONES = {
	{ Position = Vector3.new(-800, 0, 5800), Radius = 400 },
	{ Position = Vector3.new(-1800, 0, 4000), Radius = 350 },
	{ Position = Vector3.new(600, 0, 6400), Radius = 380 },
	{ Position = Vector3.new(-400, 0, 2500), Radius = 320 },
	{ Position = Vector3.new(-2600, 0, 1500), Radius = 300 },
}

local ZONE_HEIGHT = 20
local ZONE_COLOR = Color3.fromRGB(0, 200, 0)
local ZONE_TRANSPARENCY = 0.5

local SHALLOW_COLOR = Color3.fromRGB(194, 178, 128)
local SHALLOW_TRANSPARENCY = 0.6
local SHALLOW_HEIGHT = 10

local ICEBERG_COLOR = Color3.fromRGB(220, 230, 255)

-- ─── Helpers ──────────────────────────────────────────────────────────────────

local function createFolder(parent: Instance, name: string): Folder
	local folder = Instance.new("Folder")
	folder.Name = name
	folder.Parent = parent
	return folder
end

local function createPart(props: { [string]: any }): Part
	local part = Instance.new("Part")
	part.Anchored = true
	part.CanCollide = if props.CanCollide ~= nil then props.CanCollide else true
	part.Name = props.Name or "Part"
	part.Size = props.Size or Vector3.new(4, 4, 4)
	part.Position = props.Position or Vector3.new(0, 0, 0)
	part.Material = props.Material or Enum.Material.SmoothPlastic
	part.Color = props.Color or Color3.fromRGB(200, 200, 200)
	part.Transparency = props.Transparency or 0
	if props.Shape then
		part.Shape = props.Shape
	end
	part.Parent = props.Parent
	return part
end

local function weldTo(child: BasePart, parent: BasePart)
	local weld = Instance.new("WeldConstraint")
	weld.Part0 = parent
	weld.Part1 = child
	weld.Parent = parent
end

-- ─── Ocean ────────────────────────────────────────────────────────────────────

local function buildOcean()
	local terrain = workspace.Terrain
	local sizeX = MAP_MAX_X - MAP_MIN_X
	local sizeZ = MAP_MAX_Z - MAP_MIN_Z
	local centerX = (MAP_MIN_X + MAP_MAX_X) / 2
	local centerZ = (MAP_MIN_Z + MAP_MAX_Z) / 2
	local waterDepth = 50

	terrain:FillBlock(CFrame.new(centerX, -waterDepth / 2, centerZ), Vector3.new(sizeX, waterDepth, sizeZ), Enum.Material.Water)
end

-- ─── Greenland Landmass ───────────────────────────────────────────────────────

local function buildGreenland()
	local terrain = workspace.Terrain

	-- Irregular coastline segments at varying Z offsets for a natural-looking coast
	local coastSegments = {
		{ X = -4000, Z = 4200, SizeX = 2000, SizeZ = 800 },
		{ X = -2000, Z = 4400, SizeX = 2000, SizeZ = 600 },
		{ X = 0, Z = 4100, SizeX = 2000, SizeZ = 900 },
		{ X = 2000, Z = 4300, SizeX = 2000, SizeZ = 700 },
		{ X = 4000, Z = 4500, SizeX = 2000, SizeZ = 500 },
	}

	-- Main glacier body behind the coast (Z > 4600)
	terrain:FillBlock(CFrame.new(0, 25, 6300), Vector3.new(10000, 50, 3400), Enum.Material.Glacier)

	-- Snow cap on the surface
	terrain:FillBlock(CFrame.new(0, 55, 6500), Vector3.new(9000, 10, 3000), Enum.Material.Snow)

	-- Coastline segments with varying Z for irregular edge
	for _, seg in ipairs(coastSegments) do
		terrain:FillBlock(CFrame.new(seg.X, 15, seg.Z), Vector3.new(seg.SizeX, 30, seg.SizeZ), Enum.Material.Glacier)
	end

	-- FillBall bumps along the coast for natural shoreline variation
	local coastBumps = {
		{ X = -3500, Z = 4000, R = 300 },
		{ X = -1500, Z = 4100, R = 250 },
		{ X = -500, Z = 3900, R = 280 },
		{ X = 800, Z = 4050, R = 260 },
		{ X = 1800, Z = 4200, R = 220 },
		{ X = 3000, Z = 4100, R = 270 },
		{ X = 4500, Z = 4300, R = 240 },
	}

	for _, bump in ipairs(coastBumps) do
		terrain:FillBall(Vector3.new(bump.X, 10, bump.Z), bump.R, Enum.Material.Snow)
	end
end

-- ─── Capture Zones ────────────────────────────────────────────────────────────

local function buildCaptureZones(worldFolder: Folder)
	local zonesFolder = createFolder(worldFolder, "CaptureZones")

	for _, zone in ipairs(CAPTURE_ZONES) do
		-- Cylinder: Size.X = height (axis), Size.Y = diameter, Size.Z = diameter
		-- Rotate 90 deg around Z so axis points up (vertical disk at water level)
		local diameter = zone.Radius * 2
		local part = Instance.new("Part")
		part.Anchored = true
		part.CanCollide = false
		part.Name = zone.Name
		part.Shape = Enum.PartType.Cylinder
		part.Size = Vector3.new(ZONE_HEIGHT, diameter, diameter)
		part.CFrame = CFrame.new(zone.Position) * CFrame.Angles(0, 0, math.rad(90))
		part.Color = ZONE_COLOR
		part.Transparency = ZONE_TRANSPARENCY
		part.Material = Enum.Material.ForceField
		part.Parent = zonesFolder
	end
end

-- ─── Icebergs ─────────────────────────────────────────────────────────────────

local function buildSmallIceberg(position: Vector3, index: number, parent: Instance)
	local size = 10 + math.random() * 5
	local height = size * 1.2
	createPart({
		Name = string.format("Iceberg_S_%d", index),
		Position = position + Vector3.new(0, height / 2 - 3, 0),
		Size = Vector3.new(size, height, size),
		Material = Enum.Material.Glacier,
		Color = ICEBERG_COLOR,
		Parent = parent,
	})
end

local function buildMediumIceberg(position: Vector3, index: number, parent: Instance)
	local name = string.format("Iceberg_M_%d", index)

	local primary = createPart({
		Name = name,
		Position = position + Vector3.new(0, 5, 0),
		Size = Vector3.new(20, 18, 16),
		Material = Enum.Material.Glacier,
		Color = ICEBERG_COLOR,
		Parent = parent,
	})

	local child1 = createPart({
		Name = name .. "_chunk1",
		Position = position + Vector3.new(6, 8, 4),
		Size = Vector3.new(12, 14, 10),
		Material = Enum.Material.Glacier,
		Color = ICEBERG_COLOR,
		Parent = parent,
	})
	weldTo(child1, primary)

	local child2 = createPart({
		Name = name .. "_chunk2",
		Position = position + Vector3.new(-5, 3, -3),
		Size = Vector3.new(10, 10, 12),
		Material = Enum.Material.Glacier,
		Color = ICEBERG_COLOR,
		Parent = parent,
	})
	weldTo(child2, primary)
end

local function buildLargeIceberg(position: Vector3, index: number, parent: Instance)
	local name = string.format("Iceberg_L_%d", index)

	local primary = createPart({
		Name = name,
		Position = position + Vector3.new(0, 8, 0),
		Size = Vector3.new(30, 25, 28),
		Material = Enum.Material.Glacier,
		Color = ICEBERG_COLOR,
		Parent = parent,
	})

	local chunks = {
		{ Offset = Vector3.new(10, 15, 5), Size = Vector3.new(15, 18, 12) },
		{ Offset = Vector3.new(-8, 12, -6), Size = Vector3.new(12, 16, 14) },
		{ Offset = Vector3.new(5, -5, 10), Size = Vector3.new(18, 12, 10) },
		{ Offset = Vector3.new(-12, 4, 8), Size = Vector3.new(10, 14, 16) },
	}

	for i, chunk in ipairs(chunks) do
		local child = createPart({
			Name = string.format("%s_chunk%d", name, i),
			Position = position + chunk.Offset,
			Size = chunk.Size,
			Material = Enum.Material.Glacier,
			Color = ICEBERG_COLOR,
			Parent = parent,
		})
		weldTo(child, primary)
	end
end

local function buildIcebergs(worldFolder: Folder)
	local icebergFolder = createFolder(worldFolder, "Icebergs")

	for i, pos in ipairs(SMALL_ICEBERG_POSITIONS) do
		buildSmallIceberg(pos, i, icebergFolder)
	end

	for i, pos in ipairs(MEDIUM_ICEBERG_POSITIONS) do
		buildMediumIceberg(pos, i, icebergFolder)
	end

	for i, pos in ipairs(LARGE_ICEBERG_POSITIONS) do
		buildLargeIceberg(pos, i, icebergFolder)
	end
end

-- ─── Shallow Water Zones ──────────────────────────────────────────────────────

local function buildShallowWaterZones(worldFolder: Folder)
	local shallowFolder = createFolder(worldFolder, "ShallowWater")

	for i, zone in ipairs(SHALLOW_WATER_ZONES) do
		local diameter = zone.Radius * 2
		local part = Instance.new("Part")
		part.Anchored = true
		part.CanCollide = false
		part.Name = string.format("ShallowZone_%d", i)
		part.Shape = Enum.PartType.Cylinder
		part.Size = Vector3.new(SHALLOW_HEIGHT, diameter, diameter)
		part.CFrame = CFrame.new(zone.Position + Vector3.new(0, -1, 0)) * CFrame.Angles(0, 0, math.rad(90))
		part.Color = SHALLOW_COLOR
		part.Transparency = SHALLOW_TRANSPARENCY
		part.Material = Enum.Material.Sand
		part.Parent = shallowFolder
	end
end

-- ─── Spawn Docks ──────────────────────────────────────────────────────────────

local function buildSpawnDocks(worldFolder: Folder)
	local docksFolder = createFolder(worldFolder, "SpawnDocks")

	-- Main pier platform
	createPart({
		Name = "DockPlatform",
		Position = Vector3.new(0, 1, -7500),
		Size = Vector3.new(200, 4, 40),
		Material = Enum.Material.Wood,
		Color = Color3.fromRGB(139, 90, 43),
		Parent = docksFolder,
	})

	-- Left support piling
	createPart({
		Name = "DockPiling_L",
		Position = Vector3.new(-80, -10, -7500),
		Size = Vector3.new(8, 24, 8),
		Material = Enum.Material.Wood,
		Color = Color3.fromRGB(120, 75, 35),
		Parent = docksFolder,
	})

	-- Right support piling
	createPart({
		Name = "DockPiling_R",
		Position = Vector3.new(80, -10, -7500),
		Size = Vector3.new(8, 24, 8),
		Material = Enum.Material.Wood,
		Color = Color3.fromRGB(120, 75, 35),
		Parent = docksFolder,
	})
end

-- ─── Lighting ─────────────────────────────────────────────────────────────────

local function setupLighting()
	Lighting.ClockTime = 14

	-- Remove existing Atmosphere to prevent duplicates on re-run
	local existing = Lighting:FindFirstChildOfClass("Atmosphere")
	if existing then
		existing:Destroy()
	end

	local atmosphere = Instance.new("Atmosphere")
	atmosphere.Density = 0.3
	atmosphere.Offset = 0.25
	atmosphere.Color = Color3.fromRGB(200, 215, 230)
	atmosphere.Decay = Color3.fromRGB(180, 200, 220)
	atmosphere.Glare = 0.1
	atmosphere.Haze = 2
	atmosphere.Parent = Lighting
end

-- ─── Public API ───────────────────────────────────────────────────────────────

--- Build the entire game world into Workspace.World.
--- Safe to call once at server startup before any player joins.
function WorldBuilder.build()
	-- Clean up previous world if it exists (idempotent for Studio re-runs)
	local existingWorld = workspace:FindFirstChild("World")
	if existingWorld then
		existingWorld:Destroy()
	end

	local worldFolder = createFolder(workspace, "World")

	print("[WorldBuilder] Building ocean...")
	buildOcean()

	print("[WorldBuilder] Building Greenland landmass...")
	buildGreenland()

	print("[WorldBuilder] Placing capture zones...")
	buildCaptureZones(worldFolder)

	print("[WorldBuilder] Placing icebergs...")
	buildIcebergs(worldFolder)

	print("[WorldBuilder] Placing shallow water zones...")
	buildShallowWaterZones(worldFolder)

	print("[WorldBuilder] Building spawn docks...")
	buildSpawnDocks(worldFolder)

	print("[WorldBuilder] Setting up arctic lighting...")
	setupLighting()

	print("[WorldBuilder] World build complete.")
end

return WorldBuilder
