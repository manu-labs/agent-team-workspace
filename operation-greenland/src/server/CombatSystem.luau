-- CombatSystem.luau
-- Server-side combat: weapon firing, projectile tracking, hit detection,
-- NPC coastal defenses, kill/death tracking.
-- Required by: src/server/init.luau
--
-- Integration: init(remotes, shipSystem, gameManager) — accepts shared remotes
-- table from GameManager. No RemoteEvent folder is created here.
--
-- Pulls weapon stats from shared ShipConfig — no hardcoded weapon tables.
--
-- Public API:
--   CombatSystem.init(remotes, shipSystem, gameManager)
--   CombatSystem.tick(dt)
--   CombatSystem.spawnCoastalDefenses()
--   CombatSystem.damageCoastalDefense(defenseId, damage)
--   CombatSystem.getProjectiles()
--   CombatSystem.getCoastalDefenses()

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local ShipConfig = require(Shared:WaitForChild("ShipConfig"))
local Utils = require(Shared:WaitForChild("Utils"))

local CombatSystem = {}

-- ─── Dependencies ──────────────────────────────────────────────────────────────

local _remotes: { [string]: RemoteEvent } = {}
local _shipSystem: any = nil
local _gameManager: any = nil

-- ─── Internal state ────────────────────────────────────────────────────────────

local _projectiles: { any } = {}
local _nextProjectileId: number = 1

-- Per-player cooldowns: userId → { Weapon = seconds, Special = seconds }
local _cooldowns: { [number]: { [string]: number } } = {}

-- NPC coastal defenses
local _coastalDefenses: { any } = {}
local _nextDefenseId: number = 1

-- Ship proximity hit radius (studs)
local HIT_RADIUS = 15

-- ─── Coastal defense config ───────────────────────────────────────────────────

-- Positions along Greenland's coast (high Z values near capture zones)
local COASTAL_DEFENSE_POSITIONS = {
	Vector3.new(-1000, 10, 4800),
	Vector3.new(-500, 10, 5300),
	Vector3.new(0, 10, 5800),
	Vector3.new(500, 10, 5300),
	Vector3.new(1000, 10, 4800),
}

local COASTAL_DEFENSE_HEALTH = 500
local COASTAL_DEFENSE_DAMAGE = 60
local COASTAL_DEFENSE_COOLDOWN = 3 -- seconds between shots
local COASTAL_DEFENSE_SPEED = 180 -- projectile speed studs/s
local COASTAL_DEFENSE_RANGE = 400 -- targeting range studs

-- ─── Initialization ────────────────────────────────────────────────────────────

--- Accept shared remotes from GameManager plus ShipSystem and GameManager refs.
--- Call after GameManager.Init() and ShipSystem.init().
function CombatSystem.init(remotes: { [string]: RemoteEvent }, shipSystem: any, gameManager: any)
	_remotes = remotes
	_shipSystem = shipSystem
	_gameManager = gameManager

	-- Wire FireWeapon: client sends (weaponId, origin, direction)
	-- We ignore client origin (use server-authoritative ship position)
	_remotes["FireWeapon"].OnServerEvent:Connect(function(player: Player, _weaponId, _origin, direction)
		CombatSystem._handleFireWeapon(player, direction)
	end)

	-- Wire UseAbility: client sends (abilityId, targetDirection?)
	_remotes["UseAbility"].OnServerEvent:Connect(function(player: Player, _abilityId, targetDirection)
		CombatSystem._handleUseAbility(player, targetDirection)
	end)

	print("[CombatSystem] Initialised.")
end

-- ─── Tick ─────────────────────────────────────────────────────────────────────

--- Advance projectiles, hit detection, cooldowns, and coastal defense AI.
function CombatSystem.tick(dt: number)
	local state = _gameManager.GetState()
	if state ~= "Combat" and state ~= "Sailing" then
		return
	end

	-- Tick cooldowns
	for _, weapons in pairs(_cooldowns) do
		for key, cd in pairs(weapons) do
			if cd > 0 then
				weapons[key] = math.max(0, cd - dt)
			end
		end
	end

	-- Update projectiles
	local i = 1
	while i <= #_projectiles do
		local proj = _projectiles[i]
		local remove = false

		-- Move
		local displacement = proj.velocity * dt
		proj.position += displacement
		proj.distanceTraveled += displacement.Magnitude
		proj.lifetime -= dt

		-- Expiry
		if proj.lifetime <= 0 or proj.distanceTraveled >= proj.maxRange then
			remove = true
		end

		-- Hit detection: ships
		if not remove then
			remove = CombatSystem._checkShipHit(proj)
		end

		-- Hit detection: coastal defenses (player projectiles only)
		if not remove and proj.ownerId > 0 then
			remove = CombatSystem._checkDefenseHit(proj)
		end

		if remove then
			table.remove(_projectiles, i)
		else
			i += 1
		end
	end

	-- NPC coastal defense AI
	CombatSystem._tickDefenses(dt)
end

-- ─── Weapon Handlers ──────────────────────────────────────────────────────────

function CombatSystem._handleFireWeapon(player: Player, direction: Vector3?)
	local state = _gameManager.GetState()
	if state ~= "Combat" and state ~= "Sailing" then
		return
	end

	local pData = _gameManager.GetPlayerData(player)
	if not pData or not pData.shipType then
		return
	end

	-- Ship must be alive
	local shipPos = _shipSystem.GetShipPosition(player.UserId)
	if not shipPos then
		return
	end

	-- Get weapon stats from ShipConfig
	local config = ShipConfig.GetShipConfig(pData.shipType)
	if not config or not config.Weapon then
		return
	end

	-- Validate direction
	if not direction or typeof(direction) ~= "Vector3" or direction.Magnitude < 0.01 then
		return
	end

	-- Check cooldown (FireRate = shots/sec → cooldown = 1/FireRate)
	local userId = player.UserId
	if not _cooldowns[userId] then
		_cooldowns[userId] = {}
	end
	local cd = _cooldowns[userId]["Weapon"] or 0
	if cd > 0 then
		return
	end

	local cooldown = 1 / config.Weapon.FireRate
	_cooldowns[userId]["Weapon"] = cooldown

	-- Create projectile from server-authoritative position
	local lifetime = config.Weapon.Range / config.Weapon.ProjectileSpeed
	local proj = CombatSystem._createProjectile(
		userId,
		shipPos,
		direction.Unit,
		config.Weapon.Damage,
		config.Weapon.ProjectileSpeed,
		config.Weapon.Range,
		lifetime,
		nil
	)

	-- Notify clients for VFX
	_remotes["DamageDealt"]:FireAllClients("ProjectileFired", {
		id = proj.id,
		origin = shipPos,
		velocity = proj.velocity,
		weaponName = "Cannon",
		shipType = pData.shipType,
		ownerId = userId,
	})

	-- Send cooldown to player
	_remotes["CooldownUpdated"]:FireClient(player, "Weapon", cooldown, cooldown)
end

function CombatSystem._handleUseAbility(player: Player, targetDirection: Vector3?)
	local state = _gameManager.GetState()
	if state ~= "Combat" and state ~= "Sailing" then
		return
	end

	local pData = _gameManager.GetPlayerData(player)
	if not pData or not pData.shipType then
		return
	end

	local config = ShipConfig.GetShipConfig(pData.shipType)
	if not config or not config.SpecialWeapon then
		return
	end

	-- HealAura is passive (handled by ShipSystem) — skip
	if config.Special == "HealAura" then
		return
	end

	-- Ship must be alive
	local shipPos = _shipSystem.GetShipPosition(player.UserId)
	if not shipPos then
		return
	end

	-- Check cooldown
	local userId = player.UserId
	if not _cooldowns[userId] then
		_cooldowns[userId] = {}
	end
	local cd = _cooldowns[userId]["Special"] or 0
	if cd > 0 then
		return
	end

	-- Validate direction (fall back to forward if not provided)
	local dir: Vector3
	if targetDirection and typeof(targetDirection) == "Vector3" and targetDirection.Magnitude > 0.01 then
		dir = targetDirection.Unit
	else
		-- Default forward (negative Z in Roblox world space)
		dir = Vector3.new(0, 0, -1)
	end

	local cooldown = config.SpecialWeapon.Cooldown
	_cooldowns[userId]["Special"] = cooldown

	local lifetime = config.SpecialWeapon.Range / config.SpecialWeapon.ProjectileSpeed
	local proj = CombatSystem._createProjectile(
		userId,
		shipPos,
		dir,
		config.SpecialWeapon.Damage,
		config.SpecialWeapon.ProjectileSpeed,
		config.SpecialWeapon.Range,
		lifetime,
		config.SpecialWeapon.AreaRadius
	)

	_remotes["DamageDealt"]:FireAllClients("ProjectileFired", {
		id = proj.id,
		origin = shipPos,
		velocity = proj.velocity,
		weaponName = config.Special,
		shipType = pData.shipType,
		ownerId = userId,
	})

	_remotes["CooldownUpdated"]:FireClient(player, "Special", cooldown, cooldown)
end

-- ─── Projectile Creation ──────────────────────────────────────────────────────

function CombatSystem._createProjectile(
	ownerId: number,
	origin: Vector3,
	direction: Vector3,
	damage: number,
	speed: number,
	range: number,
	lifetime: number,
	areaRadius: number?
): any
	local proj = {
		id = _nextProjectileId,
		ownerId = ownerId,
		position = origin,
		velocity = direction * speed,
		damage = damage,
		lifetime = lifetime,
		maxRange = range,
		distanceTraveled = 0,
		areaRadius = areaRadius,
	}
	_nextProjectileId += 1
	table.insert(_projectiles, proj)
	return proj
end

-- ─── Hit Detection ────────────────────────────────────────────────────────────

--- Check if a projectile hit any ship. Returns true if hit (projectile consumed).
function CombatSystem._checkShipHit(proj: any): boolean
	local allShips = _shipSystem.getAllShips()

	for _, ship in pairs(allShips) do
		if not ship.IsAlive then
			continue
		end
		-- Don't hit your own ship
		if ship.OwnerId == proj.ownerId then
			continue
		end

		local dist = Utils.Distance2D(proj.position, ship.Position)

		if dist <= HIT_RADIUS then
			-- Direct hit or AoE center
			CombatSystem._applyHit(proj, ship)
			return true
		end
	end

	-- AoE splash check (for abilities with AreaRadius)
	if proj.areaRadius and proj.areaRadius > 0 then
		local hitAny = false
		for _, ship in pairs(allShips) do
			if not ship.IsAlive then
				continue
			end
			if ship.OwnerId == proj.ownerId then
				continue
			end

			local dist = Utils.Distance2D(proj.position, ship.Position)
			if dist <= proj.areaRadius then
				-- Splash damage falls off with distance
				local falloff = 1 - (dist / proj.areaRadius)
				local splashDmg = math.floor(proj.damage * falloff)
				if splashDmg > 0 then
					CombatSystem._applyDamageToShip(proj.ownerId, ship.OwnerId, splashDmg, proj.position)
				end
				hitAny = true
			end
		end
		if hitAny then
			return true
		end
	end

	return false
end

--- Apply a direct hit from a projectile to a ship.
function CombatSystem._applyHit(proj: any, ship: any)
	CombatSystem._applyDamageToShip(proj.ownerId, ship.OwnerId, proj.damage, proj.position)

	-- Notify clients of the hit
	_remotes["DamageDealt"]:FireAllClients("Hit", {
		projectileId = proj.id,
		targetUserId = ship.OwnerId,
		damage = proj.damage,
		position = proj.position,
	})
end

--- Apply damage to a ship, track kills/deaths if ship is destroyed.
function CombatSystem._applyDamageToShip(attackerId: number, victimId: number, damage: number, _hitPos: Vector3?)
	local remainingHP = _shipSystem.ApplyDamage(victimId, damage)

	if remainingHP <= 0 then
		-- Ship destroyed — track kill and death
		local attacker = Players:GetPlayerByUserId(attackerId)
		local victim = Players:GetPlayerByUserId(victimId)

		if attacker and attackerId > 0 then
			_gameManager.AddKill(attacker)
		end
		if victim then
			_gameManager.AddDeath(victim)
		end

		-- Broadcast kill feed
		local attackerName = attacker and attacker.DisplayName or "Coastal Defense"
		local victimName = victim and victim.DisplayName or "Unknown"
		_remotes["KillFeedEvent"]:FireAllClients(attackerName .. " sunk " .. victimName .. "'s ship!")
	end
end

--- Check if a projectile hit any coastal defense. Returns true if hit.
function CombatSystem._checkDefenseHit(proj: any): boolean
	for _, defense in ipairs(_coastalDefenses) do
		if defense.destroyed then
			continue
		end

		local dist = Utils.Distance2D(proj.position, defense.position)
		if dist <= 20 then -- defense hit radius
			CombatSystem.damageCoastalDefense(defense.id, proj.damage)

			_remotes["DamageDealt"]:FireAllClients("Hit", {
				projectileId = proj.id,
				targetDefenseId = defense.id,
				damage = proj.damage,
				position = proj.position,
			})
			return true
		end
	end
	return false
end

-- ─── Coastal Defenses ─────────────────────────────────────────────────────────

--- Spawn NPC coastal defenses along Greenland's coast. Call at Combat phase start.
function CombatSystem.spawnCoastalDefenses()
	_coastalDefenses = {}
	for _, pos in ipairs(COASTAL_DEFENSE_POSITIONS) do
		local id = _nextDefenseId
		_nextDefenseId += 1
		table.insert(_coastalDefenses, {
			id = id,
			position = pos,
			health = COASTAL_DEFENSE_HEALTH,
			maxHealth = COASTAL_DEFENSE_HEALTH,
			cooldown = 0,
			destroyed = false,
		})
	end
	print(("[CombatSystem] Spawned %d coastal defenses"):format(#_coastalDefenses))
end

--- Damage a coastal defense by ID.
function CombatSystem.damageCoastalDefense(defenseId: number, damage: number)
	for _, defense in ipairs(_coastalDefenses) do
		if defense.id == defenseId and not defense.destroyed then
			defense.health = math.max(0, defense.health - damage)
			if defense.health <= 0 then
				defense.destroyed = true
				_remotes["DamageDealt"]:FireAllClients("DefenseDestroyed", {
					defenseId = defenseId,
					position = defense.position,
				})
			end
			return
		end
	end
end

--- NPC auto-targeting AI: find nearest player ship in range and fire.
function CombatSystem._tickDefenses(dt: number)
	local allShips = _shipSystem.getAllShips()

	for _, defense in ipairs(_coastalDefenses) do
		if defense.destroyed then
			continue
		end

		defense.cooldown = math.max(0, defense.cooldown - dt)
		if defense.cooldown > 0 then
			continue
		end

		-- Find closest alive player ship within range
		local closestShip = nil
		local closestDist = COASTAL_DEFENSE_RANGE

		for _, ship in pairs(allShips) do
			if not ship.IsAlive then
				continue
			end
			local dist = Utils.Distance2D(defense.position, ship.Position)
			if dist < closestDist then
				closestDist = dist
				closestShip = ship
			end
		end

		if closestShip then
			local direction = (closestShip.Position - defense.position).Unit
			local lifetime = COASTAL_DEFENSE_RANGE / COASTAL_DEFENSE_SPEED

			local proj = CombatSystem._createProjectile(
				-1,
				defense.position,
				direction,
				COASTAL_DEFENSE_DAMAGE,
				COASTAL_DEFENSE_SPEED,
				COASTAL_DEFENSE_RANGE,
				lifetime,
				nil
			)

			defense.cooldown = COASTAL_DEFENSE_COOLDOWN

			_remotes["DamageDealt"]:FireAllClients("ProjectileFired", {
				id = proj.id,
				origin = defense.position,
				velocity = proj.velocity,
				weaponName = "CoastalCannon",
				defenseId = defense.id,
			})
		end
	end
end

-- ─── Queries ──────────────────────────────────────────────────────────────────

function CombatSystem.getProjectiles(): { any }
	return _projectiles
end

function CombatSystem.getCoastalDefenses(): { any }
	return _coastalDefenses
end

return CombatSystem
