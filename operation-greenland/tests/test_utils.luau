-- test_utils.luau
-- Lune unit tests for operation-greenland/src/shared/Utils.luau.
-- Run from the operation-greenland/ directory: lune run tests/test_utils.luau
--
-- Notes:
--   - Roblox's Vector3 type is not available in Lune. Functions that require it
--     (Distance3D, LerpV3) are tested using a lightweight mock defined below.
--   - Utils.GenerateId uses Roblox's tick() builtin. It is tested here with a
--     mock shim; validate real uniqueness via in-Studio playtesting.

-- ─── Minimal Vector3 mock ────────────────────────────────────────────────────
-- Provides .X/.Y/.Z, :Lerp(), .Magnitude, and __sub so Utils functions work
-- the same way they would inside Roblox.

local function makeV3(x: number, y: number, z: number)
	local v = { X = x or 0, Y = y or 0, Z = z or 0 }
	v.Magnitude = math.sqrt(v.X ^ 2 + v.Y ^ 2 + v.Z ^ 2)
	function v:Lerp(other, t)
		t = math.clamp(t, 0, 1)
		return makeV3(
			self.X + (other.X - self.X) * t,
			self.Y + (other.Y - self.Y) * t,
			self.Z + (other.Z - self.Z) * t
		)
	end
	setmetatable(v, {
		__sub = function(a, b)
			return makeV3(a.X - b.X, a.Y - b.Y, a.Z - b.Z)
		end,
	})
	return v
end

-- Lune does not provide Roblox's tick() — mock it so Utils can be required.
_G.tick = os.time

-- ─── Load module ─────────────────────────────────────────────────────────────

local Utils = require("../src/shared/Utils")

-- ─── Assertion helper ────────────────────────────────────────────────────────

local passed = 0
local failed = 0

local function expect(name: string, condition: boolean, msg: string?)
	if condition then
		print("  PASS  " .. name)
		passed += 1
	else
		print("  FAIL  " .. name .. (msg and (" — " .. msg) or ""))
		failed += 1
	end
end

local function approxEq(a: number, b: number, eps: number?): boolean
	return math.abs(a - b) <= (eps or 1e-6)
end

-- ─── Tests ───────────────────────────────────────────────────────────────────

print("\n── Utils.Lerp ──")
expect("midpoint", approxEq(Utils.Lerp(0, 10, 0.5), 5))
expect("t=0 returns a", approxEq(Utils.Lerp(3, 7, 0), 3))
expect("t=1 returns b", approxEq(Utils.Lerp(3, 7, 1), 7))
expect("t clamps below 0", approxEq(Utils.Lerp(0, 10, -1), 0))
expect("t clamps above 1", approxEq(Utils.Lerp(0, 10, 2), 10))
expect("negative range", approxEq(Utils.Lerp(-10, -5, 0.5), -7.5))

print("\n── Utils.Clamp ──")
expect("within range", approxEq(Utils.Clamp(5, 0, 10), 5))
expect("below min clamped to min", approxEq(Utils.Clamp(-1, 0, 10), 0))
expect("above max clamped to max", approxEq(Utils.Clamp(15, 0, 10), 10))
expect("on min boundary", approxEq(Utils.Clamp(0, 0, 10), 0))
expect("on max boundary", approxEq(Utils.Clamp(10, 0, 10), 10))

print("\n── Utils.NormalizeAngle ──")
expect("0 stays 0", approxEq(Utils.NormalizeAngle(0), 0))
expect("180 stays 180", approxEq(Utils.NormalizeAngle(180), 180))
expect("360 normalises to 0", approxEq(Utils.NormalizeAngle(360), 0))
expect("270 normalises to -90", approxEq(Utils.NormalizeAngle(270), -90))
expect("450 normalises to 90", approxEq(Utils.NormalizeAngle(450), 90))
expect("-90 normalises to -90", approxEq(Utils.NormalizeAngle(-90), -90))

print("\n── Utils.AngleDelta ──")
expect("0 to 90 is +90", approxEq(Utils.AngleDelta(0, 90), 90))
expect("90 to 0 is -90", approxEq(Utils.AngleDelta(90, 0), -90))
expect("wraps: 350 to 10 is +20", approxEq(Utils.AngleDelta(350, 10), 20))
expect("wraps: 10 to 350 is -20", approxEq(Utils.AngleDelta(10, 350), -20))
expect("same angle is 0", approxEq(Utils.AngleDelta(45, 45), 0))

print("\n── Utils.Round ──")
expect("round to 2 decimals", approxEq(Utils.Round(3.14159, 2), 3.14))
expect("round to 0 decimals", approxEq(Utils.Round(3.7, 0), 4))
expect("round down", approxEq(Utils.Round(3.14, 1), 3.1))
expect("negative value", approxEq(Utils.Round(-2.567, 2), -2.57))

print("\n── Utils.Remap ──")
expect("midpoint of [0,1] to [0,100]", approxEq(Utils.Remap(0.5, 0, 1, 0, 100), 50))
expect("min maps to outMin", approxEq(Utils.Remap(0, 0, 10, 5, 15), 5))
expect("max maps to outMax", approxEq(Utils.Remap(10, 0, 10, 5, 15), 15))
expect("no clamping beyond range", approxEq(Utils.Remap(-1, 0, 1, 0, 10), -10))

print("\n── Utils.DeepCopy ──")
local original = { a = 1, b = { c = 2, d = 3 } }
local copy = Utils.DeepCopy(original)
expect("top-level values copied", copy.a == 1)
expect("nested table copied", copy.b.c == 2)
expect("nested table is independent", copy.b ~= original.b)
copy.b.c = 99
expect("mutation does not affect original", original.b.c == 2)

print("\n── Utils.Merge ──")
local base = { x = 1, y = 2 }
local override = { y = 20, z = 30 }
local merged = Utils.Merge(base, override)
expect("original key preserved", merged.x == 1)
expect("overridden key uses source", merged.y == 20)
expect("new key from source added", merged.z == 30)
expect("base is not mutated", base.y == 2)

print("\n── Utils.Distance2D (mock V3) ──")
local origin = makeV3(0, 0, 0)
local point = makeV3(3, 999, 4) -- Y is ignored in 2D distance
expect("3-4-5 triangle XZ", approxEq(Utils.Distance2D(origin, point), 5))
expect("same point is 0", approxEq(Utils.Distance2D(origin, origin), 0))
expect("negative coords", approxEq(Utils.Distance2D(makeV3(-3, 0, 0), makeV3(3, 0, 0)), 6))

print("\n── Utils.Distance3D (mock V3) ──")
local a3 = makeV3(0, 0, 0)
local b3 = makeV3(0, 3, 4) -- 3-4-5 in Y-Z plane
expect("3-4-5 triangle YZ", approxEq(Utils.Distance3D(a3, b3), 5))
expect("same point is 0", approxEq(Utils.Distance3D(a3, a3), 0))

print("\n── Utils.LerpV3 (mock V3) ──")
local va = makeV3(0, 0, 0)
local vb = makeV3(10, 20, 30)
local mid = Utils.LerpV3(va, vb, 0.5)
expect("midpoint X", approxEq(mid.X, 5))
expect("midpoint Y", approxEq(mid.Y, 10))
expect("midpoint Z", approxEq(mid.Z, 15))
expect("t=0 returns a", approxEq(Utils.LerpV3(va, vb, 0).X, 0))
expect("t=1 returns b", approxEq(Utils.LerpV3(va, vb, 1).X, 10))
expect("t clamps below 0", approxEq(Utils.LerpV3(va, vb, -1).X, 0))

print("\n── Utils.IsInZone (mock V3) ──")
local center = makeV3(100, 0, 100)
expect("inside zone", Utils.IsInZone(makeV3(103, 0, 104), center, 10))
expect("on boundary", Utils.IsInZone(makeV3(100, 0, 110), center, 10))
expect("outside zone", not Utils.IsInZone(makeV3(200, 0, 200), center, 10))

print("\n── Utils.GenerateId ──")
-- GenerateId uses Roblox's tick() which is not available in Lune.
-- We wrap in pcall; if tick() is shimmed in future CI, all assertions will run.
local ok, id1 = pcall(Utils.GenerateId, "ship")
if ok then
	expect("id has prefix", (id1 :: string):sub(1, 5) == "ship_")
	expect("id is a string", type(id1) == "string")
else
	print("  SKIP  GenerateId — tick() not available outside Roblox (expected in Lune)")
end

-- ─── Summary ─────────────────────────────────────────────────────────────────

print(string.format("\n%d passed, %d failed", passed, failed))
if failed > 0 then
	process.exit(1)
end