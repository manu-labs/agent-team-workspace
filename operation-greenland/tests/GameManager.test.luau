-- tests/GameManager.test.luau
-- Unit tests for GameManager state machine and player stat tracking.
--
-- Tests state transitions, phase timer countdown, and AddKill/AddDeath/AddCapture
-- stat tracking independently of Roblox APIs.

local Assert = require("./mocks/assert")

-- ─── Constants (mirror GameManager) ───────────────────────────────────────────

local LOBBY_COUNTDOWN = 30
local MIN_PLAYERS = 1
local DEPLOY_DURATION = 30
local SAILING_DURATION = 60
local COMBAT_DURATION = 300
local END_SCREEN_DURATION = 10

-- ─── Minimal GameState simulator ──────────────────────────────────────────────
-- Mirrors GameManager's state machine logic without Roblox APIs.

type PlayerData = {
	userId: number,
	shipType: string?,
	isReady: boolean,
	score: number,
	kills: number,
	deaths: number,
	captures: number,
}

type GameSim = {
	state: string,
	phaseTimer: number,
	lobbyTimer: number,
	players: { [number]: PlayerData },
	events: { string },
}

local VALID_SHIP_TYPES = { Destroyer = true, AircraftCarrier = true, SupplyShip = true }

local function newSim(): GameSim
	return {
		state = "Lobby",
		phaseTimer = 0,
		lobbyTimer = LOBBY_COUNTDOWN,
		players = {},
		events = {},
	}
end

local function addPlayer(sim: GameSim, userId: number): PlayerData
	local data: PlayerData = {
		userId = userId,
		shipType = nil,
		isReady = false,
		score = 0,
		kills = 0,
		deaths = 0,
		captures = 0,
	}
	sim.players[userId] = data
	return data
end

--- Transition to a new state, setting the correct phase timer.
local function transitionTo(sim: GameSim, newState: string)
	local old = sim.state
	sim.state = newState
	table.insert(sim.events, old .. "->" .. newState)

	if newState == "Lobby" then
		sim.lobbyTimer = LOBBY_COUNTDOWN
		for _, data in pairs(sim.players) do
			data.shipType = nil
			data.isReady = false
			data.score = 0
			data.kills = 0
			data.deaths = 0
			data.captures = 0
		end
	elseif newState == "Deploying" then
		sim.phaseTimer = DEPLOY_DURATION
	elseif newState == "Sailing" then
		sim.phaseTimer = SAILING_DURATION
	elseif newState == "Combat" then
		sim.phaseTimer = COMBAT_DURATION
	elseif newState == "Victory" or newState == "Defeat" then
		sim.phaseTimer = END_SCREEN_DURATION
	end
end

--- Advance game by dt seconds. Mirrors GameManager.Update() timer logic.
local function update(sim: GameSim, dt: number)
	if sim.state == "Lobby" then
		local playerCount = 0
		local readyCount = 0
		for _, data in pairs(sim.players) do
			playerCount += 1
			if data.isReady then
				readyCount += 1
			end
		end
		if playerCount >= MIN_PLAYERS and readyCount == playerCount then
			transitionTo(sim, "Deploying")
		elseif playerCount >= MIN_PLAYERS then
			sim.lobbyTimer -= dt
			if sim.lobbyTimer <= 0 then
				transitionTo(sim, "Deploying")
			end
		else
			sim.lobbyTimer = LOBBY_COUNTDOWN -- reset when below min players
		end

	elseif sim.state == "Deploying" then
		sim.phaseTimer -= dt
		if sim.phaseTimer <= 0 then
			for _, data in pairs(sim.players) do
				if not data.shipType then
					data.shipType = "Destroyer"
				end
			end
			transitionTo(sim, "Sailing")
		end

	elseif sim.state == "Sailing" then
		sim.phaseTimer -= dt
		if sim.phaseTimer <= 0 then
			transitionTo(sim, "Combat")
		end

	elseif sim.state == "Combat" then
		sim.phaseTimer -= dt
		if sim.phaseTimer <= 0 then
			transitionTo(sim, "Defeat")
		end

	elseif sim.state == "Victory" or sim.state == "Defeat" then
		sim.phaseTimer -= dt
		if sim.phaseTimer <= 0 then
			transitionTo(sim, "Lobby")
		end
	end
end

local function triggerVictory(sim: GameSim)
	if sim.state == "Combat" then
		transitionTo(sim, "Victory")
	end
end

local function triggerDefeat(sim: GameSim)
	if sim.state == "Combat" then
		transitionTo(sim, "Defeat")
	end
end

local function addKill(sim: GameSim, userId: number)
	if sim.players[userId] then
		sim.players[userId].kills += 1
	end
end

local function addDeath(sim: GameSim, userId: number)
	if sim.players[userId] then
		sim.players[userId].deaths += 1
	end
end

local function addCapture(sim: GameSim, userId: number)
	if sim.players[userId] then
		sim.players[userId].captures += 1
	end
end

local function addScore(sim: GameSim, userId: number, amount: number)
	if sim.players[userId] then
		sim.players[userId].score += amount
	end
end

print("=== GameManager ===\n")

-- ─── State transitions ────────────────────────────────────────────────────────

Assert.test("initial state is Lobby", function()
	local sim = newSim()
	Assert.equal(sim.state, "Lobby")
end)

Assert.test("Lobby -> Deploying when lobby timer expires", function()
	local sim = newSim()
	addPlayer(sim, 1)
	update(sim, LOBBY_COUNTDOWN + 0.01)
	Assert.equal(sim.state, "Deploying")
end)

Assert.test("Lobby -> Deploying when all players ready (skip timer)", function()
	local sim = newSim()
	local p = addPlayer(sim, 1)
	p.isReady = true
	update(sim, 0.01) -- tiny tick, all players ready
	Assert.equal(sim.state, "Deploying")
end)

Assert.test("Deploying -> Sailing when phase timer expires", function()
	local sim = newSim()
	addPlayer(sim, 1)
	transitionTo(sim, "Deploying")
	update(sim, DEPLOY_DURATION + 0.01)
	Assert.equal(sim.state, "Sailing")
end)

Assert.test("Sailing -> Combat when phase timer expires", function()
	local sim = newSim()
	transitionTo(sim, "Sailing")
	update(sim, SAILING_DURATION + 0.01)
	Assert.equal(sim.state, "Combat")
end)

Assert.test("Combat -> Defeat when timer runs out", function()
	local sim = newSim()
	transitionTo(sim, "Combat")
	update(sim, COMBAT_DURATION + 0.01)
	Assert.equal(sim.state, "Defeat")
end)

Assert.test("Combat -> Victory via TriggerVictory", function()
	local sim = newSim()
	transitionTo(sim, "Combat")
	triggerVictory(sim)
	Assert.equal(sim.state, "Victory")
end)

Assert.test("Victory -> Lobby after end screen", function()
	local sim = newSim()
	transitionTo(sim, "Victory")
	update(sim, END_SCREEN_DURATION + 0.01)
	Assert.equal(sim.state, "Lobby")
end)

Assert.test("Defeat -> Lobby after end screen", function()
	local sim = newSim()
	transitionTo(sim, "Defeat")
	update(sim, END_SCREEN_DURATION + 0.01)
	Assert.equal(sim.state, "Lobby")
end)

Assert.test("full round cycle: Lobby -> Deploying -> Sailing -> Combat -> Victory -> Lobby", function()
	local sim = newSim()
	addPlayer(sim, 1)
	-- Lobby countdown
	update(sim, LOBBY_COUNTDOWN + 0.01)
	Assert.equal(sim.state, "Deploying")
	-- Deploy
	update(sim, DEPLOY_DURATION + 0.01)
	Assert.equal(sim.state, "Sailing")
	-- Sail
	update(sim, SAILING_DURATION + 0.01)
	Assert.equal(sim.state, "Combat")
	-- Victory
	triggerVictory(sim)
	Assert.equal(sim.state, "Victory")
	-- End screen
	update(sim, END_SCREEN_DURATION + 0.01)
	Assert.equal(sim.state, "Lobby")
end)

Assert.test("TriggerVictory is ignored outside Combat phase", function()
	local sim = newSim()
	-- In Lobby
	triggerVictory(sim)
	Assert.equal(sim.state, "Lobby")
	-- In Sailing
	transitionTo(sim, "Sailing")
	triggerVictory(sim)
	Assert.equal(sim.state, "Sailing")
end)

Assert.test("TriggerDefeat is ignored outside Combat phase", function()
	local sim = newSim()
	transitionTo(sim, "Sailing")
	triggerDefeat(sim)
	Assert.equal(sim.state, "Sailing")
end)

-- ─── Phase timer accuracy ────────────────────────────────────────────────────

Assert.test("Lobby timer starts at LOBBY_COUNTDOWN", function()
	local sim = newSim()
	Assert.equal(sim.lobbyTimer, LOBBY_COUNTDOWN)
end)

Assert.test("Deploying phase timer starts at DEPLOY_DURATION", function()
	local sim = newSim()
	transitionTo(sim, "Deploying")
	Assert.equal(sim.phaseTimer, DEPLOY_DURATION)
end)

Assert.test("Sailing phase timer starts at SAILING_DURATION", function()
	local sim = newSim()
	transitionTo(sim, "Sailing")
	Assert.equal(sim.phaseTimer, SAILING_DURATION)
end)

Assert.test("Combat phase timer starts at COMBAT_DURATION", function()
	local sim = newSim()
	transitionTo(sim, "Combat")
	Assert.equal(sim.phaseTimer, COMBAT_DURATION)
end)

Assert.test("end screen timer starts at END_SCREEN_DURATION", function()
	local sim = newSim()
	transitionTo(sim, "Victory")
	Assert.equal(sim.phaseTimer, END_SCREEN_DURATION)
end)

Assert.test("lobby timer decrements correctly with partial dt", function()
	local sim = newSim()
	addPlayer(sim, 1)
	update(sim, 5)
	Assert.close(sim.lobbyTimer, LOBBY_COUNTDOWN - 5, 0.01)
end)

Assert.test("lobby timer resets if no players", function()
	local sim = newSim()
	-- No players — timer should stay at LOBBY_COUNTDOWN
	update(sim, 100)
	Assert.equal(sim.state, "Lobby")
	Assert.equal(sim.lobbyTimer, LOBBY_COUNTDOWN)
end)

-- ─── Default ship on Deploying expiry ────────────────────────────────────────

Assert.test("player without ship type gets Destroyer when Deploying expires", function()
	local sim = newSim()
	local p = addPlayer(sim, 1)
	transitionTo(sim, "Deploying")
	Assert.isNil(p.shipType)
	update(sim, DEPLOY_DURATION + 0.01)
	Assert.equal(p.shipType, "Destroyer")
end)

Assert.test("player with selected ship keeps it when Deploying expires", function()
	local sim = newSim()
	local p = addPlayer(sim, 1)
	p.shipType = "AircraftCarrier"
	transitionTo(sim, "Deploying")
	update(sim, DEPLOY_DURATION + 0.01)
	Assert.equal(p.shipType, "AircraftCarrier")
end)

-- ─── Stat tracking ────────────────────────────────────────────────────────────

Assert.test("AddKill increments player kill count", function()
	local sim = newSim()
	addPlayer(sim, 1)
	addKill(sim, 1)
	Assert.equal(sim.players[1].kills, 1)
end)

Assert.test("AddKill accumulates over multiple kills", function()
	local sim = newSim()
	addPlayer(sim, 1)
	addKill(sim, 1)
	addKill(sim, 1)
	addKill(sim, 1)
	Assert.equal(sim.players[1].kills, 3)
end)

Assert.test("AddDeath increments player death count", function()
	local sim = newSim()
	addPlayer(sim, 1)
	addDeath(sim, 1)
	Assert.equal(sim.players[1].deaths, 1)
end)

Assert.test("AddCapture increments player capture count", function()
	local sim = newSim()
	addPlayer(sim, 1)
	addCapture(sim, 1)
	addCapture(sim, 1)
	Assert.equal(sim.players[1].captures, 2)
end)

Assert.test("AddScore increments player score", function()
	local sim = newSim()
	addPlayer(sim, 1)
	addScore(sim, 1, 50)
	addScore(sim, 1, 30)
	Assert.equal(sim.players[1].score, 80)
end)

Assert.test("stats for different players are independent", function()
	local sim = newSim()
	addPlayer(sim, 1)
	addPlayer(sim, 2)
	addKill(sim, 1)
	addDeath(sim, 2)
	Assert.equal(sim.players[1].kills, 1)
	Assert.equal(sim.players[1].deaths, 0)
	Assert.equal(sim.players[2].kills, 0)
	Assert.equal(sim.players[2].deaths, 1)
end)

Assert.test("EnterLobby resets all stats", function()
	local sim = newSim()
	addPlayer(sim, 1)
	addKill(sim, 1)
	addDeath(sim, 1)
	addCapture(sim, 1)
	addScore(sim, 1, 100)
	-- Transition back to Lobby (via full cycle)
	transitionTo(sim, "Lobby")
	local p = sim.players[1]
	Assert.equal(p.kills, 0)
	Assert.equal(p.deaths, 0)
	Assert.equal(p.captures, 0)
	Assert.equal(p.score, 0)
	Assert.equal(p.isReady, false)
	Assert.isNil(p.shipType)
end)

Assert.test("stats ignored for unknown userId", function()
	local sim = newSim()
	-- Should not error — just silently ignore unknown players
	addKill(sim, 999)
	Assert.equal(sim.players[999], nil)
end)

Assert.summary("GameManager")
