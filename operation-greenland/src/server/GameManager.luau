--[[
	GameManager -- Server-side game state machine and round lifecycle.

	Owns the core game loop: Lobby -> Deploying -> Sailing -> Combat -> Victory/Defeat -> Lobby.
	Tracks connected players and their ship selections.
	Creates and manages all RemoteEvents for server-client communication.

	Public API:
		GameManager.Init()                          -- set up remotes, connect events, enter Lobby
		GameManager.Update(dt)                      -- call every Heartbeat frame
		GameManager.GetState() -> GameState
		GameManager.GetPhaseTimeRemaining() -> number
		GameManager.GetPlayerData(player) -> PlayerData?
		GameManager.GetAllPlayerData() -> { [number]: PlayerData }
		GameManager.GetRemotes() -> { [string]: RemoteEvent }
		GameManager.AddScore(player, amount)
		GameManager.TriggerVictory()
		GameManager.TriggerDefeat()
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

------------------------------------------------------------------------
-- Types
------------------------------------------------------------------------

export type GameState = "Lobby" | "Deploying" | "Sailing" | "Combat" | "Victory" | "Defeat"

export type PlayerData = {
	player: Player,
	shipType: string?,
	isReady: boolean,
	score: number,
}

------------------------------------------------------------------------
-- Constants
------------------------------------------------------------------------

local LOBBY_COUNTDOWN   = 30   -- seconds before auto-start
local MIN_PLAYERS       = 1    -- minimum to start countdown
local DEPLOY_DURATION   = 30   -- ship selection phase
local SAILING_DURATION  = 60   -- ocean crossing phase
local COMBAT_DURATION   = 300  -- 5 min combat timer
local END_SCREEN_DURATION = 10 -- victory/defeat display

local VALID_SHIP_TYPES = {
	Destroyer = true,
	AircraftCarrier = true,
	SupplyShip = true,
}

--- All RemoteEvents the game uses, created in a single Remotes folder.
--- Every system (ShipSystem, CombatSystem, etc.) should look up remotes
--- from this folder via GameManager.GetRemotes() rather than creating
--- their own. This keeps the contract in one place for the frontend.
local REMOTE_NAMES = {
	-- Server -> Client: Game phase and timing (fired by GameManager)
	"GameStateChanged",     -- (newState: string, oldState: string)
	"GameTimerUpdated",     -- (secondsRemaining: number)
	"ReadyCountUpdated",    -- (readyCount: number, totalPlayers: number)
	"RoundEnded",           -- (result: string, stats: table)

	-- Server -> Client: Ship and player state (fired by ShipSystem)
	"ShipSpawned",          -- (data: table) new ship entered the world
	"ShipDestroyed",        -- (data: table) ship sunk, trigger client animation
	"ShipDespawned",        -- (data: table) ship removed from world
	"ShipStateUpdate",      -- (snapshot: table) bulk position/health snapshot
	"HealthUpdated",        -- (currentHP: number, maxHP: number) per-player
	"SpeedUpdated",         -- (throttlePercent: number) per-player
	"MinimapUpdated",       -- (ships: {{userId, x, z}}) broadcast
	"HealAuraActive",       -- (data: table) supply ship heal pulse for VFX

	-- Server -> Client: Combat (fired by CombatSystem)
	"DamageDealt",          -- (eventType: string, data: table)
	"CooldownUpdated",      -- (weaponId: string, remaining: number, total: number) per-player
	"KillFeedEvent",        -- (message: string)

	-- Server -> Client: Territory and score (fired by TerritorySystem)
	"TerritoryUpdate",      -- (zones: table)
	"ScoreUpdate",          -- (userId: number, score: number)

	-- Server -> Client: Hazards (fired by HazardSystem)
	"HazardUpdate",         -- (hazards: table)

	-- Client -> Server
	"PlayerSelectShip",     -- (shipType: string)
	"PlayerReady",          -- ()
	"ShipMoveInput",        -- (inputData: {forward: number, turn: number})
	"FireWeapon",           -- (weaponId: string, origin: Vector3, direction: Vector3)
	"PlayAgain",            -- ()
}

------------------------------------------------------------------------
-- Module
------------------------------------------------------------------------

local GameManager = {}

-- State
local currentState: GameState = "Lobby"
local playerDataMap: { [number]: PlayerData } = {}
local lobbyTimer: number = 0
local phaseTimer: number = 0
local remotes: { [string]: RemoteEvent } = {}

-- Timer broadcast throttle
local timerBroadcastAccum: number = 0
local TIMER_BROADCAST_INTERVAL = 1 -- send timer update every 1 second

------------------------------------------------------------------------
-- RemoteEvent setup
------------------------------------------------------------------------

function GameManager.SetupRemotes(): { [string]: RemoteEvent }
	local folder = Instance.new("Folder")
	folder.Name = "Remotes"
	folder.Parent = ReplicatedStorage

	for _, name in REMOTE_NAMES do
		local remote = Instance.new("RemoteEvent")
		remote.Name = name
		remote.Parent = folder
		remotes[name] = remote
	end

	return remotes
end

function GameManager.GetRemotes(): { [string]: RemoteEvent }
	return remotes
end

------------------------------------------------------------------------
-- Player management
------------------------------------------------------------------------

function GameManager.OnPlayerAdded(player: Player)
	playerDataMap[player.UserId] = {
		player = player,
		shipType = nil,
		isReady = false,
		score = 0,
	}
	if currentState == "Lobby" then
		GameManager._BroadcastReadyCount()
	end
end

function GameManager.OnPlayerRemoving(player: Player)
	playerDataMap[player.UserId] = nil
	if currentState == "Lobby" then
		GameManager._BroadcastReadyCount()
	end
end

function GameManager.GetPlayerData(player: Player): PlayerData?
	return playerDataMap[player.UserId]
end

function GameManager.GetAllPlayerData(): { [number]: PlayerData }
	return playerDataMap
end

------------------------------------------------------------------------
-- Broadcast helpers
------------------------------------------------------------------------

local function broadcastToAll(remoteName: string, ...: any)
	local remote = remotes[remoteName]
	if not remote then
		return
	end
	for _, data in playerDataMap do
		if data.player and data.player.Parent then
			remote:FireClient(data.player, ...)
		end
	end
end

local function fireToPlayer(remoteName: string, player: Player, ...: any)
	local remote = remotes[remoteName]
	if remote and player and player.Parent then
		remote:FireClient(player, ...)
	end
end

function GameManager._BroadcastReadyCount()
	local playerCount = 0
	local readyCount = 0
	for _, data in playerDataMap do
		playerCount += 1
		if data.isReady then
			readyCount += 1
		end
	end
	broadcastToAll("ReadyCountUpdated", readyCount, playerCount)
end

------------------------------------------------------------------------
-- State machine
------------------------------------------------------------------------

function GameManager.GetState(): GameState
	return currentState
end

function GameManager.GetPhaseTimeRemaining(): number
	if currentState == "Lobby" then
		return lobbyTimer
	end
	return phaseTimer
end

function GameManager.TransitionTo(newState: GameState)
	local oldState = currentState
	currentState = newState
	phaseTimer = 0
	timerBroadcastAccum = 0

	print(("[GameManager] %s -> %s"):format(oldState, newState))

	-- Notify all clients of phase change
	broadcastToAll("GameStateChanged", newState, oldState)

	-- State entry logic
	if newState == "Lobby" then
		GameManager._EnterLobby()
	elseif newState == "Deploying" then
		GameManager._EnterDeploying()
	elseif newState == "Sailing" then
		GameManager._EnterSailing()
	elseif newState == "Combat" then
		GameManager._EnterCombat()
	elseif newState == "Victory" then
		GameManager._EnterEndScreen("Victory")
	elseif newState == "Defeat" then
		GameManager._EnterEndScreen("Defeat")
	end

	-- Send initial timer
	broadcastToAll("GameTimerUpdated", GameManager.GetPhaseTimeRemaining())
end

------------------------------------------------------------------------
-- State entry handlers
------------------------------------------------------------------------

function GameManager._EnterLobby()
	lobbyTimer = LOBBY_COUNTDOWN
	for _, data in playerDataMap do
		data.shipType = nil
		data.isReady = false
		data.score = 0
	end
	GameManager._BroadcastReadyCount()
end

function GameManager._EnterDeploying()
	phaseTimer = DEPLOY_DURATION
end

function GameManager._EnterSailing()
	phaseTimer = SAILING_DURATION
end

function GameManager._EnterCombat()
	phaseTimer = COMBAT_DURATION
end

function GameManager._EnterEndScreen(result: string)
	phaseTimer = END_SCREEN_DURATION

	-- Build round-end stats for the UI
	local stats = {}
	for userId, data in playerDataMap do
		table.insert(stats, {
			userId = userId,
			displayName = data.player and data.player.DisplayName or "Unknown",
			shipType = data.shipType,
			score = data.score,
		})
	end

	broadcastToAll("RoundEnded", result, stats)
end

------------------------------------------------------------------------
-- State update handlers (called every Heartbeat)
------------------------------------------------------------------------

function GameManager.Update(dt: number)
	if currentState == "Lobby" then
		GameManager._UpdateLobby(dt)
	elseif currentState == "Deploying" then
		GameManager._UpdateDeploying(dt)
	elseif currentState == "Sailing" then
		GameManager._UpdateSailing(dt)
	elseif currentState == "Combat" then
		GameManager._UpdateCombat(dt)
	elseif currentState == "Victory" or currentState == "Defeat" then
		GameManager._UpdateEndScreen(dt)
	end

	-- Periodic timer broadcast
	timerBroadcastAccum += dt
	if timerBroadcastAccum >= TIMER_BROADCAST_INTERVAL then
		timerBroadcastAccum -= TIMER_BROADCAST_INTERVAL
		broadcastToAll("GameTimerUpdated", math.ceil(GameManager.GetPhaseTimeRemaining()))
	end
end

function GameManager._UpdateLobby(dt: number)
	local playerCount = 0
	local readyCount = 0
	for _, data in playerDataMap do
		playerCount += 1
		if data.isReady then
			readyCount += 1
		end
	end

	-- All players ready: skip countdown
	if playerCount >= MIN_PLAYERS and readyCount == playerCount then
		GameManager.TransitionTo("Deploying")
		return
	end

	-- Countdown while enough players are present
	if playerCount >= MIN_PLAYERS then
		lobbyTimer -= dt
		if lobbyTimer <= 0 then
			GameManager.TransitionTo("Deploying")
		end
	else
		lobbyTimer = LOBBY_COUNTDOWN
	end
end

function GameManager._UpdateDeploying(dt: number)
	phaseTimer -= dt
	if phaseTimer <= 0 then
		-- Default unselected players to Destroyer
		for _, data in playerDataMap do
			if not data.shipType then
				data.shipType = "Destroyer"
			end
		end
		GameManager.TransitionTo("Sailing")
	end
end

function GameManager._UpdateSailing(dt: number)
	phaseTimer -= dt
	if phaseTimer <= 0 then
		GameManager.TransitionTo("Combat")
	end
end

function GameManager._UpdateCombat(dt: number)
	phaseTimer -= dt
	-- Time runs out without capturing all territory: defeat
	if phaseTimer <= 0 then
		GameManager.TransitionTo("Defeat")
	end
	-- Victory is triggered externally by TerritorySystem
end

function GameManager._UpdateEndScreen(dt: number)
	phaseTimer -= dt
	if phaseTimer <= 0 then
		GameManager.TransitionTo("Lobby")
	end
end

------------------------------------------------------------------------
-- Score
------------------------------------------------------------------------

function GameManager.AddScore(player: Player, amount: number)
	local data = playerDataMap[player.UserId]
	if data then
		data.score += amount
		broadcastToAll("ScoreUpdate", player.UserId, data.score)
	end
end

------------------------------------------------------------------------
-- Client -> server handlers
------------------------------------------------------------------------

function GameManager.OnPlayerSelectShip(player: Player, shipType: string)
	local data = playerDataMap[player.UserId]
	if not data then return end
	if currentState ~= "Lobby" and currentState ~= "Deploying" then return end
	if not VALID_SHIP_TYPES[shipType] then return end

	data.shipType = shipType
end

function GameManager.OnPlayerReady(player: Player)
	local data = playerDataMap[player.UserId]
	if not data then return end
	if currentState ~= "Lobby" then return end

	data.isReady = true
	GameManager._BroadcastReadyCount()
end

function GameManager.OnPlayAgain(player: Player)
	-- Mark the player as ready for the next round.
	local data = playerDataMap[player.UserId]
	if not data then return end
	if currentState ~= "Victory" and currentState ~= "Defeat" then return end

	data.isReady = true
end

------------------------------------------------------------------------
-- External triggers (called by TerritorySystem / other systems)
------------------------------------------------------------------------

function GameManager.TriggerVictory()
	if currentState == "Combat" then
		GameManager.TransitionTo("Victory")
	end
end

function GameManager.TriggerDefeat()
	if currentState == "Combat" then
		GameManager.TransitionTo("Defeat")
	end
end

------------------------------------------------------------------------
-- Initialisation
------------------------------------------------------------------------

function GameManager.Init()
	local r = GameManager.SetupRemotes()

	-- Player lifecycle
	Players.PlayerAdded:Connect(GameManager.OnPlayerAdded)
	Players.PlayerRemoving:Connect(GameManager.OnPlayerRemoving)

	-- Handle players already in the game (late init / Studio testing)
	for _, player in Players:GetPlayers() do
		GameManager.OnPlayerAdded(player)
	end

	-- Client -> server events
	r.PlayerSelectShip.OnServerEvent:Connect(function(player, shipType)
		GameManager.OnPlayerSelectShip(player, shipType)
	end)

	r.PlayerReady.OnServerEvent:Connect(function(player)
		GameManager.OnPlayerReady(player)
	end)

	r.PlayAgain.OnServerEvent:Connect(function(player)
		GameManager.OnPlayAgain(player)
	end)

	-- Start in Lobby
	GameManager.TransitionTo("Lobby")

	print("[GameManager] Initialised.")
	return GameManager
end

return GameManager
