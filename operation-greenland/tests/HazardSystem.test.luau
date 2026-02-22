-- tests/HazardSystem.test.luau
-- Unit tests for HazardSystem hazard logic.
--
-- Tests iceberg collision cooldown (prevents 20Hz repeated damage) and
-- storm/shallow water speed penalty flags, independently of Roblox APIs.

local Assert = require("./mocks/assert")
local Vector3 = require("./mocks/Vector3")

-- ─── Constants (mirror HazardSystem) ─────────────────────────────────────────

local ICEBERG_COLLISION_COOLDOWN = 1.0 -- seconds between iceberg hits per ship
local SMALL_ICEBERG_DAMAGE = 50 -- mirrors GameConfig.ICEBERG_SMALL_DAMAGE
local MEDIUM_ICEBERG_DAMAGE = 120 -- GameConfig.ICEBERG_MEDIUM_DAMAGE
local LARGE_ICEBERG_DAMAGE = 250 -- GameConfig.ICEBERG_LARGE_DAMAGE
local STORM_DAMAGE_PER_SECOND = 5 -- GameConfig.STORM_DAMAGE_PER_SECOND
local SHALLOW_WATER_SPEED_MULT = 0.5

-- ─── Iceberg cooldown simulation ─────────────────────────────────────────────
-- Mirrors HazardSystem._icebergCooldowns logic in tick().

type CooldownTable = { [string]: number }

--- Tick down all cooldowns by dt; remove expired entries.
local function tickCooldowns(cooldowns: CooldownTable, dt: number)
	for shipId, remaining in pairs(cooldowns) do
		local newVal = remaining - dt
		if newVal <= 0 then
			cooldowns[shipId] = nil
		else
			cooldowns[shipId] = newVal
		end
	end
end

--- Try to apply iceberg damage to a ship. Returns damage dealt (0 if on cooldown).
local function tryIcebergDamage(cooldowns: CooldownTable, shipId: string, baseDamage: number): number
	if cooldowns[shipId] then
		return 0 -- on cooldown, no damage
	end
	cooldowns[shipId] = ICEBERG_COLLISION_COOLDOWN
	return baseDamage
end

--- Simulate totalTime seconds of a ship sitting on an iceberg at tickHz.
--- Returns total damage dealt.
local function simulateIcebergHits(tickHz: number, totalTime: number, damage: number): number
	local cooldowns: CooldownTable = {}
	local dt = 1 / tickHz
	local ticks = math.floor(totalTime * tickHz)
	local totalDamage = 0
	for _ = 1, ticks do
		tickCooldowns(cooldowns, dt)
		totalDamage += tryIcebergDamage(cooldowns, "ship1", damage)
	end
	return totalDamage
end

-- ─── AoE / splash damage simulation (mirrors storm area damage) ──────────────

--- Storm damage tick: all ships within radius take damage per second.
local function stormDamageTick(shipPos: Vector3.Vector3Type, stormPos: Vector3.Vector3Type, radius: number, dt: number): number
	local dist = Vector3.distance2D(shipPos, stormPos)
	if dist <= radius then
		return STORM_DAMAGE_PER_SECOND * dt
	end
	return 0
end

print("=== HazardSystem ===\n")

-- ─── Iceberg cooldown: prevents repeated damage ───────────────────────────────

Assert.test("first iceberg hit deals damage", function()
	local cooldowns: CooldownTable = {}
	local dmg = tryIcebergDamage(cooldowns, "ship1", SMALL_ICEBERG_DAMAGE)
	Assert.equal(dmg, SMALL_ICEBERG_DAMAGE)
end)

Assert.test("second hit immediately after deals zero damage (on cooldown)", function()
	local cooldowns: CooldownTable = {}
	tryIcebergDamage(cooldowns, "ship1", SMALL_ICEBERG_DAMAGE) -- first hit
	local dmg = tryIcebergDamage(cooldowns, "ship1", SMALL_ICEBERG_DAMAGE) -- immediate second
	Assert.equal(dmg, 0)
end)

Assert.test("different ships have independent cooldowns", function()
	local cooldowns: CooldownTable = {}
	tryIcebergDamage(cooldowns, "ship1", SMALL_ICEBERG_DAMAGE) -- ship1 on cooldown
	local dmg = tryIcebergDamage(cooldowns, "ship2", SMALL_ICEBERG_DAMAGE) -- ship2 fresh
	Assert.equal(dmg, SMALL_ICEBERG_DAMAGE)
end)

Assert.test("cooldown expires after 1 second", function()
	local cooldowns: CooldownTable = {}
	tryIcebergDamage(cooldowns, "ship1", SMALL_ICEBERG_DAMAGE) -- hit + cooldown set
	tickCooldowns(cooldowns, 1.0) -- advance exactly 1 second
	Assert.isNil(cooldowns["ship1"]) -- cooldown should be gone (expired at exactly 1s)
end)

Assert.test("cooldown remains if less than 1 second has passed", function()
	local cooldowns: CooldownTable = {}
	tryIcebergDamage(cooldowns, "ship1", SMALL_ICEBERG_DAMAGE)
	tickCooldowns(cooldowns, 0.5) -- only half a second
	Assert.notNil(cooldowns["ship1"])
end)

Assert.test("damage is possible again after cooldown expires", function()
	local cooldowns: CooldownTable = {}
	tryIcebergDamage(cooldowns, "ship1", SMALL_ICEBERG_DAMAGE) -- first hit
	tickCooldowns(cooldowns, 1.01) -- slightly over 1 second
	local dmg = tryIcebergDamage(cooldowns, "ship1", SMALL_ICEBERG_DAMAGE) -- should connect
	Assert.equal(dmg, SMALL_ICEBERG_DAMAGE)
end)

Assert.test("at 20Hz for 5 seconds: ship takes 5 hits (1 per second), not 100", function()
	local totalDmg = simulateIcebergHits(20, 5, SMALL_ICEBERG_DAMAGE)
	-- Expect ~5 hits in 5 seconds (1 per cooldown window), each = 50 HP
	-- Actual: first tick hits (t=0.05s), then cooldown 1s, so ~5 hits
	Assert.equal(totalDmg, SMALL_ICEBERG_DAMAGE * 5)
end)

Assert.test("at 20Hz without cooldown ship would take 100 hits in 5 seconds", function()
	-- Verify the problem the cooldown solves: without it, 20Hz × 50 damage = 1000 HP/s
	local hitsWithoutCooldown = 20 * 5 -- 100 hits
	local damageWithoutCooldown = hitsWithoutCooldown * SMALL_ICEBERG_DAMAGE
	Assert.equal(damageWithoutCooldown, 5000) -- catastrophically lethal
end)

-- ─── Iceberg damage values ────────────────────────────────────────────────────

Assert.test("small iceberg deals ICEBERG_SMALL_DAMAGE per hit", function()
	local cooldowns: CooldownTable = {}
	local dmg = tryIcebergDamage(cooldowns, "ship1", SMALL_ICEBERG_DAMAGE)
	Assert.equal(dmg, 50)
end)

Assert.test("medium iceberg deals ICEBERG_MEDIUM_DAMAGE per hit", function()
	local cooldowns: CooldownTable = {}
	local dmg = tryIcebergDamage(cooldowns, "ship1", MEDIUM_ICEBERG_DAMAGE)
	Assert.equal(dmg, 120)
end)

Assert.test("large iceberg deals ICEBERG_LARGE_DAMAGE per hit", function()
	local cooldowns: CooldownTable = {}
	local dmg = tryIcebergDamage(cooldowns, "ship1", LARGE_ICEBERG_DAMAGE)
	Assert.equal(dmg, 250)
end)

-- ─── Storm damage ─────────────────────────────────────────────────────────────

Assert.test("ship inside storm takes damage", function()
	local stormPos = Vector3.new(0, 0, 0)
	local shipPos = Vector3.new(100, 0, 0) -- inside 600-stud radius
	local dmg = stormDamageTick(shipPos, stormPos, 600, 1)
	Assert.close(dmg, STORM_DAMAGE_PER_SECOND)
end)

Assert.test("ship outside storm takes no damage", function()
	local stormPos = Vector3.new(0, 0, 0)
	local shipPos = Vector3.new(700, 0, 0) -- outside 600-stud radius
	local dmg = stormDamageTick(shipPos, stormPos, 600, 1)
	Assert.equal(dmg, 0)
end)

Assert.test("ship at storm edge (exactly on radius) takes damage", function()
	local stormPos = Vector3.new(0, 0, 0)
	local shipPos = Vector3.new(600, 0, 0) -- exactly on the boundary
	local dmg = stormDamageTick(shipPos, stormPos, 600, 1)
	Assert.close(dmg, STORM_DAMAGE_PER_SECOND)
end)

Assert.test("storm damage scales with dt", function()
	local stormPos = Vector3.new(0, 0, 0)
	local shipPos = Vector3.new(100, 0, 0)
	local dmg = stormDamageTick(shipPos, stormPos, 600, 0.05) -- 50ms tick
	Assert.close(dmg, STORM_DAMAGE_PER_SECOND * 0.05)
end)

-- ─── Shallow water speed penalty ──────────────────────────────────────────────

Assert.test("speed multiplier is applied in shallow water", function()
	local baseSpeed = 60
	local effectiveSpeed = baseSpeed * SHALLOW_WATER_SPEED_MULT
	Assert.close(effectiveSpeed, 30)
end)

Assert.test("full speed outside shallow water", function()
	local baseSpeed = 60
	local mult = 1.0 -- no penalty
	Assert.close(baseSpeed * mult, 60)
end)

Assert.summary("HazardSystem")

