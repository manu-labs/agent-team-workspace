-- ShipConfig.luau
-- Ship type definitions, stats, and weapon configurations for Operation Greenland

local ShipConfig = {}

-- Ship type identifier constants
ShipConfig.ShipType = {
	DESTROYER = "Destroyer",
	AIRCRAFT_CARRIER = "AircraftCarrier",
	SUPPLY_SHIP = "SupplyShip",
}

-- Per-ship stat tables
-- Speed: max speed in studs/second
-- Acceleration: studs/second^2
-- TurnRate: degrees/second
-- Health: hit points
-- Firepower: descriptive tier ("low" | "medium" | "high")
-- Special: name of the special ability
-- Weapon: main gun stats
-- SpecialWeapon: special ability stats
-- ShallowWaterSpeedMultiplier: speed factor in shallow coastal waters
ShipConfig.Ships = {
	[ShipConfig.ShipType.DESTROYER] = {
		DisplayName = "Destroyer",
		ModelId = "destroyer_model",
		Speed = 60,
		Acceleration = 15,
		TurnRate = 45,
		Health = 500,
		Firepower = "medium",
		Special = "Torpedoes",
		Weapon = {
			Damage = 75,
			FireRate = 1.0,      -- shots per second
			Range = 400,         -- studs
			ProjectileSpeed = 250,
		},
		SpecialWeapon = {
			Damage = 250,
			Cooldown = 15,       -- seconds between uses
			Range = 600,
			ProjectileSpeed = 120,
		},
		ShallowWaterSpeedMultiplier = 1.0,  -- nimble, unaffected by shallows
	},

	[ShipConfig.ShipType.AIRCRAFT_CARRIER] = {
		DisplayName = "Aircraft Carrier",
		ModelId = "carrier_model",
		Speed = 25,
		Acceleration = 5,
		TurnRate = 15,
		Health = 1200,
		Firepower = "high",
		Special = "DroneStrike",
		Weapon = {
			Damage = 120,
			FireRate = 0.5,
			Range = 600,
			ProjectileSpeed = 200,
		},
		SpecialWeapon = {
			Damage = 400,
			Cooldown = 30,
			Range = 800,
			AreaRadius = 80,     -- AoE blast radius in studs
		},
		ShallowWaterSpeedMultiplier = 0.4,  -- sluggish in shallow water
	},

	[ShipConfig.ShipType.SUPPLY_SHIP] = {
		DisplayName = "Supply Ship",
		ModelId = "supply_model",
		Speed = 40,
		Acceleration = 8,
		TurnRate = 30,
		Health = 300,
		Firepower = "low",
		Special = "HealAura",
		Weapon = {
			Damage = 35,
			FireRate = 0.75,
			Range = 250,
			ProjectileSpeed = 180,
		},
		SpecialWeapon = {
			HealPerSecond = 15,  -- HP/sec restored to nearby friendlies
			AuraRadius = 100,    -- studs
			Cooldown = 0,        -- passive, always active while alive
		},
		ShallowWaterSpeedMultiplier = 0.85,
	},
}

--- Retrieve a ship config by ShipType string. Returns nil if not found.
function ShipConfig.GetShipConfig(shipType: string)
	return ShipConfig.Ships[shipType]
end

--- Return a list of all valid ShipType strings.
function ShipConfig.GetAllShipTypes(): {string}
	local types = {}
	for shipType in pairs(ShipConfig.Ships) do
		table.insert(types, shipType)
	end
	return types
end

return ShipConfig