-- ShipModelBuilder.luau
-- Builds three ship models programmatically into ReplicatedStorage.ShipModels.
-- Called once at server startup by init.server.luau before other systems init.
--
-- Client ShipController listens for ShipSpawned and clones the appropriate model
-- from ReplicatedStorage.ShipModels into workspace.
--
-- Ship orientation convention: +Z is the ship's forward direction.
-- All part offsets are expressed as (right, up, forward) relative to hull centre.
-- Waterline sits at Y=0 on the hull; hull extends equally above and below.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ShipModelBuilder = {}

-- ─── Internal helpers ─────────────────────────────────────────────────────────

--- Create a plain Part with standard surface settings.
local function makePart(name: string, size: Vector3, color: Color3, material: Enum.Material, anchored: boolean): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.Color = color
	part.Material = material
	part.Anchored = anchored
	part.CastShadow = true
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	return part
end

--- Weld part1 rigidly to part0.
local function weld(part0: Part, part1: Part)
	local wc = Instance.new("WeldConstraint")
	wc.Part0 = part0
	wc.Part1 = part1
	wc.Parent = part0
end

--- Create an invisible TiltPart at the hull centre (used by ShipController for roll tilt).
local function makeTiltPart(hull: Part): Part
	local tilt = makePart("TiltPart", Vector3.new(1, 0.1, 1), hull.Color, hull.Material, false)
	tilt.Transparency = 1
	tilt.Position = hull.Position
	return tilt
end

--- Create a WakePart at the ship's stern with a ParticleEmitter for water-wake VFX.
--- sternZ: Z offset of the stern from hull centre (negative = behind).
local function makeWakePart(hull: Part, sternZ: number): Part
	local wake = makePart(
		"WakePart",
		Vector3.new(hull.Size.X * 0.6, 0.2, 4),
		Color3.fromRGB(200, 230, 255),
		Enum.Material.SmoothPlastic,
		false
	)
	wake.Transparency = 1
	wake.Position = Vector3.new(hull.Position.X, hull.Position.Y - hull.Size.Y * 0.4, hull.Position.Z + sternZ)

	local emitter = Instance.new("ParticleEmitter")
	emitter.Name = "WakeEmitter"
	emitter.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 255, 255)),
		ColorSequenceKeypoint.new(0.5, Color3.fromRGB(210, 235, 255)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(160, 200, 240)),
	})
	emitter.LightEmission = 0.1
	emitter.Lifetime = NumberRange.new(1.5, 2.5)
	emitter.Rate = 18
	emitter.Speed = NumberRange.new(3, 7)
	emitter.SpreadAngle = Vector2.new(40, 20) -- wide laterally, narrow vertically
	emitter.Size = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.8),
		NumberSequenceKeypoint.new(0.5, 1.2),
		NumberSequenceKeypoint.new(1, 0),
	})
	emitter.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.3),
		NumberSequenceKeypoint.new(0.6, 0.6),
		NumberSequenceKeypoint.new(1, 1),
	})
	emitter.RotSpeed = NumberRange.new(-30, 30)
	emitter.Rotation = NumberRange.new(0, 360)
	emitter.Parent = wake

	return wake
end

-- ─── Ship builders ────────────────────────────────────────────────────────────

--- Build destroyer_model: 30-stud sleek gray warship.
--- Silhouette: low narrow hull, central bridge tower, twin gun turrets, tall mast.
local function buildDestroyer(folder: Folder)
	local hullColor = Color3.fromRGB(140, 140, 140)
	local darkGray = Color3.fromRGB(110, 110, 110)
	local mat = Enum.Material.Metal

	-- Hull: 30 studs long, 7 wide, 3 tall.
	local hull = makePart("Hull", Vector3.new(7, 3, 30), hullColor, mat, false)
	hull.Position = Vector3.new(0, 0, 0)

	-- Bow: WedgePart that tapers the front to a point (overlaps front of hull).
	local bowPart = Instance.new("WedgePart")
	bowPart.Name = "Bow"
	bowPart.Size = Vector3.new(7, 3, 6)
	bowPart.Color = hullColor
	bowPart.Material = mat
	bowPart.Anchored = false
	bowPart.CastShadow = true
	bowPart.TopSurface = Enum.SurfaceType.Smooth
	bowPart.BottomSurface = Enum.SurfaceType.Smooth
	-- WedgePart slopes back to front; rotate 180° so it tapers forward
	bowPart.CFrame = CFrame.new(0, 0, 18) * CFrame.Angles(0, math.pi, 0)

	-- Bridge / superstructure: central block above hull
	local bridge = makePart("Bridge", Vector3.new(5, 3, 7), darkGray, mat, false)
	bridge.Position = Vector3.new(0, 3, 3)

	-- Bridge wings: narrow side extensions
	local wingL = makePart("BridgeWingL", Vector3.new(1.5, 1, 4), darkGray, mat, false)
	wingL.Position = Vector3.new(-3.25, 3.5, 3)
	local wingR = makePart("BridgeWingR", Vector3.new(1.5, 1, 4), darkGray, mat, false)
	wingR.Position = Vector3.new(3.25, 3.5, 3)

	-- Mast: tall thin cylinder above bridge
	local mast = makePart("Mast", Vector3.new(0.4, 6, 0.4), Color3.fromRGB(90, 90, 90), mat, false)
	mast.Position = Vector3.new(0, 7.5, 3)

	-- Forward gun turret
	local gunFwd = makePart("GunFwd", Vector3.new(2, 1.2, 2.5), darkGray, mat, false)
	gunFwd.Position = Vector3.new(0, 2.1, 11)
	local gunFwdBarrel = makePart("GunFwdBarrel", Vector3.new(0.4, 0.4, 3), Color3.fromRGB(90, 90, 90), mat, false)
	gunFwdBarrel.Position = Vector3.new(0, 2.4, 13.5)

	-- Aft gun turret
	local gunAft = makePart("GunAft", Vector3.new(2, 1.2, 2.5), darkGray, mat, false)
	gunAft.Position = Vector3.new(0, 2.1, -8)
	local gunAftBarrel = makePart("GunAftBarrel", Vector3.new(0.4, 0.4, 3), Color3.fromRGB(90, 90, 90), mat, false)
	gunAftBarrel.Position = Vector3.new(0, 2.4, -10.5)

	-- Funnel (smoke stack)
	local funnel = makePart("Funnel", Vector3.new(1.5, 2.5, 2), Color3.fromRGB(80, 80, 80), mat, false)
	funnel.Position = Vector3.new(0, 4, -1)

	-- Deck: thin slab on top of hull
	local deck = makePart("Deck", Vector3.new(6.5, 0.4, 28), Color3.fromRGB(120, 120, 120), mat, false)
	deck.Position = Vector3.new(0, 1.7, 0)

	-- TiltPart and WakePart
	local tiltPart = makeTiltPart(hull)
	local wakePart = makeWakePart(hull, -16)

	-- Assemble model
	local model = Instance.new("Model")
	model.Name = "destroyer_model"

	hull.Parent = model
	bowPart.Parent = model
	bridge.Parent = model
	wingL.Parent = model
	wingR.Parent = model
	mast.Parent = model
	gunFwd.Parent = model
	gunFwdBarrel.Parent = model
	gunAft.Parent = model
	gunAftBarrel.Parent = model
	funnel.Parent = model
	deck.Parent = model
	tiltPart.Parent = model
	wakePart.Parent = model

	model.PrimaryPart = hull

	-- Weld everything to hull
	for _, child in model:GetChildren() do
		if child:IsA("BasePart") and child ~= hull then
			weld(hull, child)
		end
	end

	model.Parent = folder
end

--- Build carrier_model: 80-stud wide-deck aircraft carrier.
--- Silhouette: massive flat flight deck, starboard island/tower, wide beam.
local function buildCarrier(folder: Folder)
	local hullColor = Color3.fromRGB(100, 100, 100)
	local darkGray = Color3.fromRGB(75, 75, 75)
	local mat = Enum.Material.Metal

	-- Main hull: 80 long, 18 wide, 5 tall
	local hull = makePart("Hull", Vector3.new(18, 5, 80), hullColor, mat, false)
	hull.Position = Vector3.new(0, 0, 0)

	-- Flight deck: very wide flat slab overhanging hull sides
	local deck = makePart("FlightDeck", Vector3.new(22, 1, 82), Color3.fromRGB(80, 80, 80), mat, false)
	deck.Position = Vector3.new(0, 3, 0)

	-- Deck markings strip (centre-line)
	local deckLine =
		makePart("DeckLine", Vector3.new(1, 0.1, 75), Color3.fromRGB(220, 220, 50), Enum.Material.SmoothPlastic, false)
	deckLine.Position = Vector3.new(0, 3.55, 0)

	-- Island / control tower on starboard side
	local island = makePart("Island", Vector3.new(6, 10, 18), darkGray, mat, false)
	island.Position = Vector3.new(10, 8.5, 5)

	-- Island bridge windows (cosmetic strip)
	local windows =
		makePart("IslandWindows", Vector3.new(0.3, 2, 12), Color3.fromRGB(150, 200, 220), Enum.Material.SmoothPlastic, false)
	windows.Position = Vector3.new(13.15, 11, 5)

	-- Island radar mast
	local mast = makePart("Mast", Vector3.new(0.5, 8, 0.5), Color3.fromRGB(60, 60, 60), mat, false)
	mast.Position = Vector3.new(10, 17.5, 5)

	-- Radar dish (flat cylinder approximation)
	local radar = makePart("Radar", Vector3.new(3, 0.4, 3), Color3.fromRGB(160, 160, 160), mat, false)
	radar.Position = Vector3.new(10, 22, 5)

	-- Angled ski-jump ramp at bow (wedge)
	local ramp = Instance.new("WedgePart")
	ramp.Name = "SkiJump"
	ramp.Size = Vector3.new(22, 3, 8)
	ramp.Color = Color3.fromRGB(70, 70, 70)
	ramp.Material = mat
	ramp.Anchored = false
	ramp.CastShadow = true
	ramp.TopSurface = Enum.SurfaceType.Smooth
	ramp.BottomSurface = Enum.SurfaceType.Smooth
	ramp.CFrame = CFrame.new(0, 4.5, 41) -- at bow end of flight deck

	-- Hull sponsons (side armour bulges at waterline)
	local sponsonL = makePart("SponsonL", Vector3.new(3, 3, 70), Color3.fromRGB(90, 90, 90), mat, false)
	sponsonL.Position = Vector3.new(-10.5, -0.5, 0)
	local sponsonR = makePart("SponsonR", Vector3.new(3, 3, 70), Color3.fromRGB(90, 90, 90), mat, false)
	sponsonR.Position = Vector3.new(10.5, -0.5, 0)

	-- Stern elevator platform
	local elevator = makePart("SternElevator", Vector3.new(10, 0.5, 10), Color3.fromRGB(85, 85, 85), mat, false)
	elevator.Position = Vector3.new(-5, 3.75, -38)

	-- TiltPart and WakePart (wide carrier leaves a large wake)
	local tiltPart = makeTiltPart(hull)
	local wakePart = makeWakePart(hull, -41)

	local model = Instance.new("Model")
	model.Name = "carrier_model"

	hull.Parent = model
	deck.Parent = model
	deckLine.Parent = model
	island.Parent = model
	windows.Parent = model
	mast.Parent = model
	radar.Parent = model
	ramp.Parent = model
	sponsonL.Parent = model
	sponsonR.Parent = model
	elevator.Parent = model
	tiltPart.Parent = model
	wakePart.Parent = model

	model.PrimaryPart = hull

	for _, child in model:GetChildren() do
		if child:IsA("BasePart") and child ~= hull then
			weld(hull, child)
		end
	end

	model.Parent = folder
end

--- Build supply_model: 40-stud boxy cargo/supply vessel.
--- Silhouette: high-sided rectangular hull, prominent cargo hold, squat bridge.
local function buildSupply(folder: Folder)
	local hullColor = Color3.fromRGB(120, 140, 120)
	local darkGreen = Color3.fromRGB(90, 110, 90)
	local mat = Enum.Material.SmoothPlastic

	-- Hull: 40 long, 12 wide, 5 tall — boxy high-sided freighter
	local hull = makePart("Hull", Vector3.new(12, 5, 40), hullColor, mat, false)
	hull.Position = Vector3.new(0, 0, 0)

	-- Main cargo hold: large boxy structure on deck (forward section)
	local cargo = makePart("CargoHold", Vector3.new(10, 5, 20), darkGreen, mat, false)
	cargo.Position = Vector3.new(0, 5, 8)

	-- Cargo hatch covers
	local hatch1 = makePart("Hatch1", Vector3.new(7, 0.3, 7), Color3.fromRGB(100, 120, 100), mat, false)
	hatch1.Position = Vector3.new(0, 7.65, 12)
	local hatch2 = makePart("Hatch2", Vector3.new(7, 0.3, 7), Color3.fromRGB(100, 120, 100), mat, false)
	hatch2.Position = Vector3.new(0, 7.65, 4)

	-- Bridge / wheelhouse (aft, raised above cargo)
	local bridge = makePart("Bridge", Vector3.new(10, 5, 8), Color3.fromRGB(110, 130, 110), mat, false)
	bridge.Position = Vector3.new(0, 5, -14)

	-- Bridge windows
	local bWindows =
		makePart("BridgeWindows", Vector3.new(8, 1.5, 0.3), Color3.fromRGB(140, 190, 210), Enum.Material.SmoothPlastic, false)
	bWindows.Position = Vector3.new(0, 7, -10.15)

	-- Funnel / exhaust stack (aft of bridge)
	local funnel = makePart("Funnel", Vector3.new(2, 4, 2), Color3.fromRGB(70, 90, 70), mat, false)
	funnel.Position = Vector3.new(0, 9.5, -16)
	-- Funnel top cap
	local funnelTop = makePart("FunnelTop", Vector3.new(2.5, 0.5, 2.5), Color3.fromRGB(40, 40, 40), mat, false)
	funnelTop.Position = Vector3.new(0, 11.75, -16)

	-- Deck crane (A-frame approximation)
	local craneBase = makePart("CraneBase", Vector3.new(1, 4, 1), Color3.fromRGB(180, 160, 80), mat, false)
	craneBase.Position = Vector3.new(3, 4.5, 5)
	local craneBoom = makePart("CraneBoom", Vector3.new(0.6, 0.6, 10), Color3.fromRGB(180, 160, 80), mat, false)
	craneBoom.CFrame = CFrame.new(3, 7, 10) * CFrame.Angles(0, 0, math.rad(20))

	-- Side railings (thin strips along hull top edge)
	local railL = makePart("RailL", Vector3.new(0.3, 1, 38), Color3.fromRGB(160, 180, 160), mat, false)
	railL.Position = Vector3.new(-6.35, 3.5, 0)
	local railR = makePart("RailR", Vector3.new(0.3, 1, 38), Color3.fromRGB(160, 180, 160), mat, false)
	railR.Position = Vector3.new(6.35, 3.5, 0)

	-- Red cross medical marking (flat decal approximation via two overlapping parts)
	local crossH = makePart("CrossH", Vector3.new(4, 0.15, 1.5), Color3.fromRGB(220, 40, 40), mat, false)
	crossH.Position = Vector3.new(0, 7.73, 8)
	local crossV = makePart("CrossV", Vector3.new(1.5, 0.15, 4), Color3.fromRGB(220, 40, 40), mat, false)
	crossV.Position = Vector3.new(0, 7.74, 8)

	-- TiltPart and WakePart
	local tiltPart = makeTiltPart(hull)
	local wakePart = makeWakePart(hull, -21)

	local model = Instance.new("Model")
	model.Name = "supply_model"

	hull.Parent = model
	cargo.Parent = model
	hatch1.Parent = model
	hatch2.Parent = model
	bridge.Parent = model
	bWindows.Parent = model
	funnel.Parent = model
	funnelTop.Parent = model
	craneBase.Parent = model
	craneBoom.Parent = model
	railL.Parent = model
	railR.Parent = model
	crossH.Parent = model
	crossV.Parent = model
	tiltPart.Parent = model
	wakePart.Parent = model

	model.PrimaryPart = hull

	for _, child in model:GetChildren() do
		if child:IsA("BasePart") and child ~= hull then
			weld(hull, child)
		end
	end

	model.Parent = folder
end

-- ─── Public API ───────────────────────────────────────────────────────────────

--- Build all ship models and place them in ReplicatedStorage.ShipModels.
--- Safe to call multiple times: skips creation if the folder already exists.
function ShipModelBuilder.build()
	if ReplicatedStorage:FindFirstChild("ShipModels") then
		return
	end

	local folder = Instance.new("Folder")
	folder.Name = "ShipModels"

	buildDestroyer(folder)
	buildCarrier(folder)
	buildSupply(folder)

	folder.Parent = ReplicatedStorage

	print("[ShipModelBuilder] Built 3 ship models into ReplicatedStorage.ShipModels")
end

return ShipModelBuilder
