-- tests/mocks/Vector3.luau
-- Minimal Vector3 implementation for Lune unit tests.
-- Covers the operations used by game logic (arithmetic, Magnitude, Unit, Distance).

local Vector3 = {}
Vector3.__index = Vector3

export type Vector3Type = typeof(setmetatable(
	{} :: { X: number, Y: number, Z: number, Magnitude: number },
	Vector3
))

function Vector3.new(x: number?, y: number?, z: number?): Vector3Type
	local self = setmetatable({}, Vector3)
	self.X = x or 0
	self.Y = y or 0
	self.Z = z or 0
	self.Magnitude = math.sqrt(self.X ^ 2 + self.Y ^ 2 + self.Z ^ 2)
	return self
end

function Vector3.__add(a: Vector3Type, b: Vector3Type): Vector3Type
	return Vector3.new(a.X + b.X, a.Y + b.Y, a.Z + b.Z)
end

function Vector3.__sub(a: Vector3Type, b: Vector3Type): Vector3Type
	return Vector3.new(a.X - b.X, a.Y - b.Y, a.Z - b.Z)
end

function Vector3.__mul(a: Vector3Type | number, b: Vector3Type | number): Vector3Type
	if type(a) == "number" then
		return Vector3.new(a * (b :: Vector3Type).X, a * (b :: Vector3Type).Y, a * (b :: Vector3Type).Z)
	elseif type(b) == "number" then
		return Vector3.new((a :: Vector3Type).X * b, (a :: Vector3Type).Y * b, (a :: Vector3Type).Z * b)
	end
	return Vector3.new(
		(a :: Vector3Type).X * (b :: Vector3Type).X,
		(a :: Vector3Type).Y * (b :: Vector3Type).Y,
		(a :: Vector3Type).Z * (b :: Vector3Type).Z
	)
end

function Vector3.__unm(a: Vector3Type): Vector3Type
	return Vector3.new(-a.X, -a.Y, -a.Z)
end

function Vector3.__eq(a: Vector3Type, b: Vector3Type): boolean
	return a.X == b.X and a.Y == b.Y and a.Z == b.Z
end

function Vector3.__tostring(v: Vector3Type): string
	return ("Vector3(%g, %g, %g)"):format(v.X, v.Y, v.Z)
end

--- Returns the unit (normalised) vector. Returns zero vector if magnitude is 0.
function Vector3:unit(): Vector3Type
	local m = self.Magnitude
	if m < 1e-9 then
		return Vector3.new(0, 0, 0)
	end
	return Vector3.new(self.X / m, self.Y / m, self.Z / m)
end

--- 2D horizontal distance (ignores Y).
function Vector3.distance2D(a: Vector3Type, b: Vector3Type): number
	local dx = a.X - b.X
	local dz = a.Z - b.Z
	return math.sqrt(dx * dx + dz * dz)
end

return Vector3
