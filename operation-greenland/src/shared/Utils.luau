-- Utils.luau
-- Stateless utility functions shared across server and client modules.
-- All functions are pure — no side effects, no global state.

local Utils = {}

--- Calculate the horizontal (XZ-plane) distance between two Vector3 positions.
function Utils.Distance2D(a: Vector3, b: Vector3): number
	local dx = a.X - b.X
	local dz = a.Z - b.Z
	return math.sqrt(dx * dx + dz * dz)
end

--- Calculate the full 3D distance between two Vector3 positions.
function Utils.Distance3D(a: Vector3, b: Vector3): number
	return (a - b).Magnitude
end

--- Linear interpolation between two numbers. t is clamped to [0, 1].
function Utils.Lerp(a: number, b: number, t: number): number
	return a + (b - a) * math.clamp(t, 0, 1)
end

--- Linear interpolation between two Vector3 values. t is clamped to [0, 1].
function Utils.LerpV3(a: Vector3, b: Vector3, t: number): Vector3
	return a:Lerp(b, math.clamp(t, 0, 1))
end

--- Clamp a number between min and max (inclusive).
function Utils.Clamp(value: number, min: number, max: number): number
	return math.clamp(value, min, max)
end

--- Normalize an angle in degrees to the range [-180, 180].
function Utils.NormalizeAngle(angle: number): number
	angle = angle % 360
	if angle > 180 then
		angle -= 360
	end
	return angle
end

--- Return the shortest signed angular difference from 'from' to 'to' (degrees).
function Utils.AngleDelta(from: number, to: number): number
	return Utils.NormalizeAngle(to - from)
end

--- Deep copy a table up to 2 levels deep (sufficient for config/state tables).
--- Does not handle metatables or circular references.
function Utils.DeepCopy(original: {[any]: any}): {[any]: any}
	local copy = {}
	for key, value in pairs(original) do
		if type(value) == "table" then
			local inner = {}
			for k2, v2 in pairs(value) do
				inner[k2] = v2
			end
			copy[key] = inner
		else
			copy[key] = value
		end
	end
	return copy
end

--- Shallow-merge 'source' into a copy of 'dest'. Source keys overwrite dest keys.
function Utils.Merge(dest: {[any]: any}, source: {[any]: any}): {[any]: any}
	local result = Utils.DeepCopy(dest)
	for key, value in pairs(source) do
		result[key] = value
	end
	return result
end

--- Return true if 'position' is within 'radius' studs of 'zoneCenter' (XZ plane).
function Utils.IsInZone(position: Vector3, zoneCenter: Vector3, radius: number): boolean
	return Utils.Distance2D(position, zoneCenter) <= radius
end

--- Round 'value' to 'decimals' decimal places.
function Utils.Round(value: number, decimals: number): number
	local factor = 10 ^ decimals
	return math.floor(value * factor + 0.5) / factor
end

--- Generate a locally unique ID string using tick() and a random suffix.
--- Not guaranteed globally unique across servers — use for local entity IDs only.
function Utils.GenerateId(prefix: string?): string
	local p = prefix or "id"
	return p .. "_" .. tostring(math.floor(tick() * 1000)) .. "_" .. tostring(math.random(1000, 9999))
end

--- Map a value from one range to another (no clamping).
--- Example: Utils.Remap(0.5, 0, 1, 0, 100) == 50
function Utils.Remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number
	return outMin + (value - inMin) / (inMax - inMin) * (outMax - outMin)
end

return Utils