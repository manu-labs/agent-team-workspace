--[[
	CombatSystem — Server-side weapon firing, projectile tracking, hit detection,
	and NPC coastal defenses.

	Depends on:
		GameManager  — game state checks, remotes
		ShipSystem   — reading ship positions/health, applying damage (stubbed for now)

	Public API:
		CombatSystem.Init(gameManager)  — one-time setup
		CombatSystem.Update(dt)         — call every Heartbeat
		CombatSystem.FireWeapon(player, weaponId, origin, direction)
		CombatSystem.SpawnCoastalDefenses()
		CombatSystem.GetProjectiles() → { Projectile }
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

------------------------------------------------------------------------
-- Types
------------------------------------------------------------------------

export type Projectile = {
	id: number,
	ownerId: number,           -- player UserId or -1 for NPC
	position: Vector3,
	velocity: Vector3,
	damage: number,
	lifetime: number,          -- seconds remaining
	maxRange: number,
	distanceTraveled: number,
}

export type WeaponDef = {
	name: string,
	damage: number,
	fireRate: number,          -- seconds between shots
	speed: number,             -- studs/sec projectile speed
	range: number,             -- max range in studs
	lifetime: number,          -- max seconds alive
	areaRadius: number?,       -- nil = single target, number = AoE radius
}

export type CoastalDefense = {
	id: number,
	position: Vector3,
	health: number,
	maxHealth: number,
	weapon: WeaponDef,
	cooldown: number,          -- time until next shot
	range: number,
	destroyed: boolean,
}

------------------------------------------------------------------------
-- Weapon definitions (will be moved to shared ShipConfig eventually)
------------------------------------------------------------------------

local WEAPONS: { [string]: { [string]: WeaponDef } } = {
	Destroyer = {
		Cannon = {
			name = "Cannon",
			damage = 40,
			fireRate = 1.5,
			speed = 200,
			range = 300,
			lifetime = 3,
		},
		Torpedo = {
			name = "Torpedo",
			damage = 120,
			fireRate = 5,
			speed = 80,
			range = 500,
			lifetime = 8,
		},
	},
	AircraftCarrier = {
		DroneStrike = {
			name = "DroneStrike",
			damage = 200,
			fireRate = 10,
			speed = 120,
			range = 800,
			lifetime = 10,
			areaRadius = 30,
		},
	},
	SupplyShip = {
		LightGun = {
			name = "LightGun",
			damage = 15,
			fireRate = 0.5,
			speed = 250,
			range = 150,
			lifetime = 2,
		},
	},
}

local COASTAL_DEFENSE_WEAPON: WeaponDef = {
	name = "CoastalCannon",
	damage = 60,
	fireRate = 3,
	speed = 180,
	range = 400,
	lifetime = 4,
}

------------------------------------------------------------------------
-- Coastal defense spawn positions (along Greenland coast)
------------------------------------------------------------------------

local COASTAL_DEFENSE_POSITIONS = {
	Vector3.new(2000, 10, 0),
	Vector3.new(2000, 10, 300),
	Vector3.new(2000, 10, -300),
	Vector3.new(2200, 10, 150),
	Vector3.new(2200, 10, -150),
}

local COASTAL_DEFENSE_HEALTH = 500

------------------------------------------------------------------------
-- Module
------------------------------------------------------------------------

local CombatSystem = {}

-- Dependencies (set in Init)
local gameManager = nil

-- State
local projectiles: { Projectile } = {}
local nextProjectileId: number = 1
local coastalDefenses: { CoastalDefense } = {}
local nextDefenseId: number = 1
local playerCooldowns: { [number]: { [string]: number } } = {} -- userId → weaponName → cooldown remaining

------------------------------------------------------------------------
-- Internal helpers
------------------------------------------------------------------------

local function createProjectile(ownerId: number, origin: Vector3, direction: Vector3, weapon: WeaponDef): Projectile
	local proj: Projectile = {
		id = nextProjectileId,
		ownerId = ownerId,
		position = origin,
		velocity = direction.Unit * weapon.speed,
		damage = weapon.damage,
		lifetime = weapon.lifetime,
		maxRange = weapon.range,
		distanceTraveled = 0,
	}
	nextProjectileId += 1
	table.insert(projectiles, proj)
	return proj
end

--- Simple proximity-based hit detection against all ships.
--- Returns the first ship hit (userId) and hit position, or nil.
local function checkHitsForProjectile(proj: Projectile, hitRadius: number): (number?, Vector3?)
	-- TODO: Replace with actual ShipSystem position lookups once #88 is merged.
	-- For now, this is a stub that returns nil (no hits).
	-- The real implementation will iterate ShipSystem.GetAllShips() and check
	-- distance between proj.position and each ship position.
	return nil, nil
end

--- Find the closest player ship within range of a coastal defense.
local function findClosestTarget(defense: CoastalDefense): (number?, Vector3?)
	-- TODO: Integrate with ShipSystem (#88) to get actual ship positions.
	-- Stub: iterate GameManager player data and use placeholder positions.
	local allPlayerData = gameManager.GetAllPlayerData()
	-- Without ShipSystem, we can not determine ship positions yet.
	-- This will be wired up when ShipSystem is available.
	return nil, nil
end

------------------------------------------------------------------------
-- Public API
------------------------------------------------------------------------

function CombatSystem.FireWeapon(player: Player, weaponId: string, origin: Vector3, direction: Vector3)
	local state = gameManager.GetState()
	if state ~= "Combat" and state ~= "Sailing" then
		return -- weapons only active during sailing/combat
	end

	local pData = gameManager.GetPlayerData(player)
	if not pData or not pData.shipType then
		return
	end

	-- Validate weapon exists for this ship type
	local shipWeapons = WEAPONS[pData.shipType]
	if not shipWeapons then return end
	local weaponDef = shipWeapons[weaponId]
	if not weaponDef then return end

	-- Check cooldown
	local userId = player.UserId
	if not playerCooldowns[userId] then
		playerCooldowns[userId] = {}
	end
	local cd = playerCooldowns[userId][weaponId] or 0
	if cd > 0 then
		return -- still on cooldown
	end

	-- Fire
	playerCooldowns[userId][weaponId] = weaponDef.fireRate
	local proj = createProjectile(userId, origin, direction, weaponDef)

	-- Notify clients for VFX
	local remotes = gameManager.GetRemotes()
	if remotes.DamageDealt then
		remotes.DamageDealt:FireAllClients("ProjectileFired", {
			id = proj.id,
			origin = origin,
			velocity = proj.velocity,
			weaponName = weaponDef.name,
			shipType = pData.shipType,
		})
	end
end

function CombatSystem.SpawnCoastalDefenses()
	coastalDefenses = {}
	for _, pos in COASTAL_DEFENSE_POSITIONS do
		local defense: CoastalDefense = {
			id = nextDefenseId,
			position = pos,
			health = COASTAL_DEFENSE_HEALTH,
			maxHealth = COASTAL_DEFENSE_HEALTH,
			weapon = COASTAL_DEFENSE_WEAPON,
			cooldown = 0,
			range = COASTAL_DEFENSE_WEAPON.range,
			destroyed = false,
		}
		nextDefenseId += 1
		table.insert(coastalDefenses, defense)
	end
	print(("[CombatSystem] Spawned %d coastal defenses"):format(#coastalDefenses))
end

function CombatSystem.DamageCoastalDefense(defenseId: number, damage: number)
	for _, defense in coastalDefenses do
		if defense.id == defenseId and not defense.destroyed then
			defense.health -= damage
			if defense.health <= 0 then
				defense.health = 0
				defense.destroyed = true
				print(("[CombatSystem] Coastal defense %d destroyed"):format(defenseId))
			end
			return
		end
	end
end

function CombatSystem.GetProjectiles(): { Projectile }
	return projectiles
end

function CombatSystem.GetCoastalDefenses(): { CoastalDefense }
	return coastalDefenses
end

function CombatSystem.GetWeaponsForShip(shipType: string): { [string]: WeaponDef }?
	return WEAPONS[shipType]
end

------------------------------------------------------------------------
-- Update
------------------------------------------------------------------------

function CombatSystem.Update(dt: number)
	local state = gameManager.GetState()
	if state ~= "Combat" and state ~= "Sailing" then
		return
	end

	-- Update player cooldowns
	for userId, weapons in playerCooldowns do
		for weaponName, cd in weapons do
			if cd > 0 then
				weapons[weaponName] = math.max(0, cd - dt)
			end
		end
	end

	-- Update projectiles
	local remotes = gameManager.GetRemotes()
	local i = 1
	while i <= #projectiles do
		local proj = projectiles[i]
		local remove = false

		-- Move
		local displacement = proj.velocity * dt
		proj.position += displacement
		proj.distanceTraveled += displacement.Magnitude
		proj.lifetime -= dt

		-- Check expiry
		if proj.lifetime <= 0 or proj.distanceTraveled >= proj.maxRange then
			remove = true
		end

		-- Hit detection (proximity-based)
		if not remove then
			local hitUserId, hitPos = checkHitsForProjectile(proj, 10)
			if hitUserId then
				-- TODO: Apply damage via ShipSystem once #88 is available
				-- ShipSystem.ApplyDamage(hitUserId, proj.damage)

				-- Notify clients
				if remotes.DamageDealt then
					remotes.DamageDealt:FireAllClients("Hit", {
						projectileId = proj.id,
						targetUserId = hitUserId,
						damage = proj.damage,
						position = hitPos,
					})
				end
				remove = true
			end
		end

		if remove then
			table.remove(projectiles, i)
		else
			i += 1
		end
	end

	-- Update coastal defenses (NPC auto-targeting)
	for _, defense in coastalDefenses do
		if defense.destroyed then
			continue
		end

		defense.cooldown -= dt
		if defense.cooldown <= 0 then
			local targetUserId, targetPos = findClosestTarget(defense)
			if targetUserId and targetPos then
				local direction = (targetPos - defense.position)
				if direction.Magnitude <= defense.range then
					createProjectile(-1, defense.position, direction, defense.weapon)
					defense.cooldown = defense.weapon.fireRate
				end
			end
		end
	end
end

------------------------------------------------------------------------
-- Initialisation
------------------------------------------------------------------------

function CombatSystem.Init(gm)
	gameManager = gm

	-- Listen for fire requests from clients
	local remotes = gm.GetRemotes()
	-- We reuse DamageDealt for client→server fire requests
	-- (In practice, a dedicated "FireWeapon" remote would be cleaner —
	-- adding it to the remote list if needed.)
	-- For now, clients call PlayerSelectShip-style:
	-- we add a new remote below if it doesn not already exist.

	local remotesFolder = ReplicatedStorage:FindFirstChild("Remotes")
	if remotesFolder then
		local fireRemote = remotesFolder:FindFirstChild("FireWeapon")
		if not fireRemote then
			fireRemote = Instance.new("RemoteEvent")
			fireRemote.Name = "FireWeapon"
			fireRemote.Parent = remotesFolder
		end

		fireRemote.OnServerEvent:Connect(function(player: Player, weaponId: string, origin: Vector3, direction: Vector3)
			CombatSystem.FireWeapon(player, weaponId, origin, direction)
		end)
	end

	print("[CombatSystem] Initialised.")
	return CombatSystem
end

return CombatSystem
