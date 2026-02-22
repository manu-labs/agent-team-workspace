-- tests/mocks/assert.luau
-- Lightweight assertion helpers for Lune unit tests.

local process = require("@lune/process")

local Assert = {}
local _passed = 0
local _failed = 0

function Assert.equal(actual: any, expected: any, msg: string?)
	if actual ~= expected then
		error(
			string.format(
				"%s\n  expected: %s\n  got:      %s",
				msg or "assertEqual failed",
				tostring(expected),
				tostring(actual)
			),
			2
		)
	end
end

function Assert.notEqual(actual: any, expected: any, msg: string?)
	if actual == expected then
		error(
			string.format("%s: both are %s", msg or "assertNotEqual failed", tostring(actual)),
			2
		)
	end
end

function Assert.close(actual: number, expected: number, epsilon: number?, msg: string?)
	local eps = epsilon or 0.001
	if math.abs(actual - expected) > eps then
		error(
			string.format(
				"%s\n  expected: ~%g (±%g)\n  got:      %g",
				msg or "assertClose failed",
				expected,
				eps,
				actual
			),
			2
		)
	end
end

function Assert.isTrue(v: any, msg: string?)
	if not v then
		error(msg or ("expected truthy, got " .. tostring(v)), 2)
	end
end

function Assert.isFalse(v: any, msg: string?)
	if v then
		error(msg or ("expected falsy, got " .. tostring(v)), 2)
	end
end

function Assert.isNil(v: any, msg: string?)
	if v ~= nil then
		error(msg or ("expected nil, got " .. tostring(v)), 2)
	end
end

function Assert.notNil(v: any, msg: string?)
	if v == nil then
		error(msg or "expected non-nil value", 2)
	end
end

--- Run a named test case and collect pass/fail.
function Assert.test(name: string, fn: () -> ())
	local ok, err = pcall(fn)
	if ok then
		_passed += 1
		print("  PASS  " .. name)
	else
		_failed += 1
		print("  FAIL  " .. name)
		print("        " .. tostring(err))
	end
end

--- Print summary and exit non-zero if any tests failed.
function Assert.summary(suiteName: string)
	local total = _passed + _failed
	print(string.format("\n%s: %d/%d passed", suiteName, _passed, total))
	if _failed > 0 then
		process.exit(1)
	end
end

return Assert
