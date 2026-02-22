-- test_ship_config.luau
-- Lune unit tests for operation-greenland/src/shared/ShipConfig.luau.
-- Run from the operation-greenland/ directory: lune run tests/test_ship_config.luau

local ShipConfig = require("../src/shared/ShipConfig")

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

-- ─── Tests ───────────────────────────────────────────────────────────────────

print("\n── ShipConfig.ShipType constants ──")
expect("DESTROYER constant exists", ShipConfig.ShipType.DESTROYER == "Destroyer")
expect("AIRCRAFT_CARRIER constant exists", ShipConfig.ShipType.AIRCRAFT_CARRIER == "AircraftCarrier")
expect("SUPPLY_SHIP constant exists", ShipConfig.ShipType.SUPPLY_SHIP == "SupplyShip")

print("\n── ShipConfig.GetShipConfig — Destroyer ──")
local destroyer = ShipConfig.GetShipConfig("Destroyer")
expect("Destroyer config exists", destroyer ~= nil)
expect("Destroyer DisplayName", destroyer.DisplayName == "Destroyer")
expect("Destroyer ModelId", destroyer.ModelId == "destroyer_model")
expect("Destroyer Speed is positive", (destroyer.Speed or 0) > 0)
expect("Destroyer Acceleration is positive", (destroyer.Acceleration or 0) > 0)
expect("Destroyer TurnRate is positive", (destroyer.TurnRate or 0) > 0)
expect("Destroyer Health is positive", (destroyer.Health or 0) > 0)
expect("Destroyer has Weapon table", type(destroyer.Weapon) == "table")
expect("Destroyer Weapon.Damage is positive", (destroyer.Weapon.Damage or 0) > 0)
expect("Destroyer Weapon.Range is positive", (destroyer.Weapon.Range or 0) > 0)
expect("Destroyer has SpecialWeapon table", type(destroyer.SpecialWeapon) == "table")
expect("Destroyer ShallowWaterSpeedMultiplier in range (0,1]", (destroyer.ShallowWaterSpeedMultiplier or 0) > 0 and (destroyer.ShallowWaterSpeedMultiplier or 0) <= 1)

print("\n── ShipConfig.GetShipConfig — AircraftCarrier ──")
local carrier = ShipConfig.GetShipConfig("AircraftCarrier")
expect("AircraftCarrier config exists", carrier ~= nil)
expect("AircraftCarrier DisplayName", carrier.DisplayName == "Aircraft Carrier")
expect("AircraftCarrier ModelId", carrier.ModelId == "carrier_model")
expect("AircraftCarrier Health > Destroyer Health", (carrier.Health or 0) > (destroyer.Health or 0))
expect("AircraftCarrier Speed < Destroyer Speed (it is slower)", (carrier.Speed or 0) < (destroyer.Speed or 0))
expect("AircraftCarrier shallow water penalty", (carrier.ShallowWaterSpeedMultiplier or 1) < 1)
expect("AircraftCarrier DroneStrike AreaRadius exists", (carrier.SpecialWeapon.AreaRadius or 0) > 0)

print("\n── ShipConfig.GetShipConfig — SupplyShip ──")
local supply = ShipConfig.GetShipConfig("SupplyShip")
expect("SupplyShip config exists", supply ~= nil)
expect("SupplyShip ModelId", supply.ModelId == "supply_model")
expect("SupplyShip HealPerSecond is positive", (supply.SpecialWeapon.HealPerSecond or 0) > 0)
expect("SupplyShip AuraRadius is positive", (supply.SpecialWeapon.AuraRadius or 0) > 0)
expect("SupplyShip Cooldown is 0 (passive)", supply.SpecialWeapon.Cooldown == 0)

print("\n── ShipConfig.GetShipConfig — unknown type ──")
expect("unknown type returns nil", ShipConfig.GetShipConfig("Battleship") == nil)
expect("nil input returns nil", ShipConfig.GetShipConfig(nil) == nil)

print("\n── ShipConfig.GetAllShipTypes ──")
local allTypes = ShipConfig.GetAllShipTypes()
expect("returns a table", type(allTypes) == "table")
expect("returns 3 types", #allTypes == 3)

local typeSet = {}
for _, t in ipairs(allTypes) do
	typeSet[t] = true
end
expect("contains Destroyer", typeSet["Destroyer"] == true)
expect("contains AircraftCarrier", typeSet["AircraftCarrier"] == true)
expect("contains SupplyShip", typeSet["SupplyShip"] == true)

print("\n── Cross-ship sanity checks ──")
-- All ships should be retrievable by their own ShipType constant
for _, shipType in ipairs(ShipConfig.GetAllShipTypes()) do
	local cfg = ShipConfig.GetShipConfig(shipType)
	expect(shipType .. " has Firepower field", type(cfg.Firepower) == "string")
	expect(shipType .. " has Special field", type(cfg.Special) == "string")
end

-- ─── Summary ─────────────────────────────────────────────────────────────────

print(string.format("\n%d passed, %d failed", passed, failed))
if failed > 0 then
	process.exit(1)
end