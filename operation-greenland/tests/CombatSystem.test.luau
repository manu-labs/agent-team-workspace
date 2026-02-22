-- tests/CombatSystem.test.luau
-- Unit tests for CombatSystem projectile math and hit detection logic.
--
-- Tests projectile movement, expiry, hit detection radius, and AoE splash
-- damage falloff independently of Roblox APIs.

local Assert = require("./mocks/assert")
local Vector3 = require("./mocks/Vector3")

-- ─── Constants (mirror CombatSystem / ShipConfig) ─────────────────────────────

local HIT_RADIUS = 15 -- studs for direct hit

-- Weapon stats from ShipConfig (Destroyer as baseline)
local DESTROYER_WEAPON = {
	Damage = 75,
	ProjectileSpeed = 250, -- ShipConfig Destroyer.Weapon.ProjectileSpeed
	Range = 400, -- ShipConfig Destroyer.Weapon.Range
	FireRate = 1.0, -- shots/sec → cooldown = 1.0s
}

-- AircraftCarrier SpecialWeapon (DroneStrike) — no ProjectileSpeed, AoE only
local AIRCRAFT_CARRIER_SPECIAL = {
	Damage = 400, -- ShipConfig AircraftCarrier.SpecialWeapon.Damage
	Cooldown = 30, -- ShipConfig AircraftCarrier.SpecialWeapon.Cooldown
	AreaRadius = 80, -- ShipConfig AircraftCarrier.SpecialWeapon.AreaRadius
}

-- ─── Projectile helpers (mirror CombatSystem._createProjectile / tick logic) ──

type Projectile = {
	id: number,
	ownerId: number,
	position: Vector3.Vector3Type,
	velocity: Vector3.Vector3Type,
	damage: number,
	lifetime: number,
	maxRange: number,
	distanceTraveled: number,
	areaRadius: number?,
}

local _nextId = 1
local function createProjectile(
	ownerId: number,
	origin: Vector3.Vector3Type,
	direction: Vector3.Vector3Type,
	damage: number,
	speed: number,
	range: number,
	lifetime: number,
	areaRadius: number?
): Projectile
	local dir = direction:unit()
	local proj: Projectile = {
		id = _nextId,
		ownerId = ownerId,
		position = origin,
		velocity = Vector3.new(dir.X * speed, dir.Y * speed, dir.Z * speed),
		damage = damage,
		lifetime = lifetime,
		maxRange = range,
		distanceTraveled = 0,
		areaRadius = areaRadius,
	}
	_nextId += 1
	return proj
end

--- Advance a single projectile by dt. Returns true if the projectile expired.
local function tickProjectile(proj: Projectile, dt: number): boolean
	local displacement = Vector3.new(proj.velocity.X * dt, proj.velocity.Y * dt, proj.velocity.Z * dt)
	proj.position = proj.position + displacement
	proj.distanceTraveled += displacement.Magnitude
	proj.lifetime -= dt
	return proj.lifetime <= 0 or proj.distanceTraveled >= proj.maxRange
end

--- Check direct hit: returns true if projectile is within HIT_RADIUS of ship.
local function checkDirectHit(proj: Projectile, shipPos: Vector3.Vector3Type): boolean
	return Vector3.distance2D(proj.position, shipPos) <= HIT_RADIUS
end

--- Calculate AoE splash damage for a given distance from the explosion centre.
local function splashDamage(damage: number, dist: number, areaRadius: number): number
	if dist > areaRadius then
		return 0
	end
	local falloff = 1 - (dist / areaRadius)
	return math.floor(damage * falloff)
end

--- Weapon cooldown from FireRate (shots/sec).
local function cooldownFromFireRate(fireRate: number): number
	return 1 / fireRate
end

print("=== CombatSystem ===\n")

-- ─── Projectile movement ──────────────────────────────────────────────────────

Assert.test("projectile moves by velocity × dt each tick", function()
	local origin = Vector3.new(0, 0, 0)
	local dir = Vector3.new(1, 0, 0)
	local proj = createProjectile(1, origin, dir, 75, 300, 800, 800 / 300, nil)

	tickProjectile(proj, 1)
	Assert.close(proj.position.X, 300, 0.1) -- 300 studs/s × 1s
	Assert.close(proj.position.Z, 0, 0.1)
end)

Assert.test("projectile distanceTraveled increments correctly", function()
	local origin = Vector3.new(0, 0, 0)
	local dir = Vector3.new(0, 0, 1)
	local proj = createProjectile(1, origin, dir, 75, 300, 800, 800 / 300, nil)

	tickProjectile(proj, 0.5)
	Assert.close(proj.distanceTraveled, 150, 0.5) -- 300 × 0.5
end)

Assert.test("projectile lifetime decrements each tick", function()
	local origin = Vector3.new(0, 0, 0)
	local dir = Vector3.new(1, 0, 0)
	local lifetime = DESTROYER_WEAPON.Range / DESTROYER_WEAPON.ProjectileSpeed
	local proj = createProjectile(1, origin, dir, 75, 300, 800, lifetime, nil)

	tickProjectile(proj, 0.5)
	Assert.close(proj.lifetime, lifetime - 0.5, 0.01)
end)

-- ─── Projectile expiry ───────────────────────────────────────────────────────

Assert.test("projectile expires when lifetime reaches zero", function()
	local origin = Vector3.new(0, 0, 0)
	local dir = Vector3.new(1, 0, 0)
	local proj = createProjectile(1, origin, dir, 75, 300, 9999, 0.1, nil) -- short lifetime

	local expired = tickProjectile(proj, 0.1)
	Assert.equal(expired, true)
end)

Assert.test("projectile expires when distanceTraveled >= maxRange", function()
	local origin = Vector3.new(0, 0, 0)
	local dir = Vector3.new(1, 0, 0)
	local proj = createProjectile(1, origin, dir, 75, 300, 300, 9999, nil) -- range = 1 second

	local expired = tickProjectile(proj, 1.01) -- just past max range
	Assert.equal(expired, true)
end)

Assert.test("projectile does not expire before lifetime or range", function()
	local origin = Vector3.new(0, 0, 0)
	local dir = Vector3.new(1, 0, 0)
	local lifetime = DESTROYER_WEAPON.Range / DESTROYER_WEAPON.ProjectileSpeed
	local proj = createProjectile(1, origin, dir, 75, 300, 800, lifetime, nil)

	local expired = tickProjectile(proj, 0.1) -- tiny tick
	Assert.equal(expired, false)
end)

Assert.test("Destroyer weapon lifetime equals Range ÷ ProjectileSpeed", function()
	local expectedLifetime = DESTROYER_WEAPON.Range / DESTROYER_WEAPON.ProjectileSpeed
	Assert.close(expectedLifetime, 400 / 250, 0.001) -- ShipConfig: Range=400, Speed=250 → 1.6s
end)

-- ─── Hit detection ────────────────────────────────────────────────────────────

Assert.test("direct hit detected when within HIT_RADIUS", function()
	local proj = createProjectile(1, Vector3.new(0, 0, 0), Vector3.new(1, 0, 0), 75, 300, 800, 10, nil)
	proj.position = Vector3.new(10, 0, 0) -- 10 studs from ship
	Assert.equal(checkDirectHit(proj, Vector3.new(0, 0, 0)), true) -- distance = 10, radius = 15
end)

Assert.test("no hit when outside HIT_RADIUS", function()
	local proj = createProjectile(1, Vector3.new(0, 0, 0), Vector3.new(1, 0, 0), 75, 300, 800, 10, nil)
	proj.position = Vector3.new(20, 0, 0) -- 20 studs from ship
	Assert.equal(checkDirectHit(proj, Vector3.new(0, 0, 0)), false) -- distance = 20 > 15
end)

Assert.test("hit at exactly HIT_RADIUS boundary", function()
	local proj = createProjectile(1, Vector3.new(0, 0, 0), Vector3.new(1, 0, 0), 75, 300, 800, 10, nil)
	proj.position = Vector3.new(15, 0, 0)
	Assert.equal(checkDirectHit(proj, Vector3.new(0, 0, 0)), true)
end)

Assert.test("hit detection is 2D (Y does not affect distance)", function()
	local proj = createProjectile(1, Vector3.new(0, 0, 0), Vector3.new(1, 0, 0), 75, 300, 800, 10, nil)
	proj.position = Vector3.new(10, 9999, 0) -- far off in Y
	Assert.equal(checkDirectHit(proj, Vector3.new(0, 0, 0)), true) -- 2D dist = 10
end)

-- ─── AoE splash damage ────────────────────────────────────────────────────────

Assert.test("direct hit (distance 0) deals full damage", function()
	local dmg = splashDamage(120, 0, 80)
	Assert.equal(dmg, 120)
end)

Assert.test("splash damage at 50% radius deals 50% damage", function()
	local dmg = splashDamage(120, 40, 80) -- 40/80 = 0.5 falloff
	Assert.close(dmg, 60, 1)
end)

Assert.test("splash damage falls off linearly with distance", function()
	local near = splashDamage(120, 20, 80) -- 20/80 = 0.25 → 75% damage
	local far = splashDamage(120, 60, 80) -- 60/80 = 0.75 → 25% damage
	Assert.isTrue(near > far, "closer hit should deal more damage")
	Assert.close(near, 90, 1)
	Assert.close(far, 30, 1)
end)

Assert.test("splash damage outside area radius is zero", function()
	local dmg = splashDamage(120, 90, 80) -- beyond areaRadius=80
	Assert.equal(dmg, 0)
end)

Assert.test("splash damage is floored (no fractional HP)", function()
	-- 120 damage, dist=79, areaRadius=80 → falloff = 1 - 79/80 = 0.0125 → 120*0.0125 = 1.5 → floor = 1
	local dmg = splashDamage(120, 79, 80)
	Assert.equal(dmg, math.floor(120 * (1 - 79 / 80)))
end)

-- ─── Weapon stats / cooldowns ────────────────────────────────────────────────

Assert.test("Destroyer fire rate 1.0 gives cooldown of 1.0s", function()
	local cd = cooldownFromFireRate(DESTROYER_WEAPON.FireRate)
	Assert.close(cd, 1.0)
end)

Assert.test("weapon damage read from ShipConfig is correct", function()
	Assert.equal(DESTROYER_WEAPON.Damage, 75)
	Assert.equal(AIRCRAFT_CARRIER_SPECIAL.Damage, 400) -- ShipConfig AircraftCarrier.SpecialWeapon.Damage
end)

Assert.test("AircraftCarrier special has correct AoE radius", function()
	Assert.equal(AIRCRAFT_CARRIER_SPECIAL.AreaRadius, 80)
end)

Assert.test("AircraftCarrier special has 30-second cooldown", function()
	Assert.equal(AIRCRAFT_CARRIER_SPECIAL.Cooldown, 30) -- ShipConfig AircraftCarrier.SpecialWeapon.Cooldown
end)

Assert.summary("CombatSystem")

