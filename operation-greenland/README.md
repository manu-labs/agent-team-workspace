# Operation Greenland

A Roblox naval conquest game where players join a US fleet to cross the Atlantic and capture Greenland.

## Tech Stack

- **Language**: Luau (Roblox scripting language)
- **Project tool**: [Rojo](https://rojo.space/) — syncs external code files into Roblox Studio
- **Architecture**: Server / Client / Shared module pattern

## Prerequisites

1. **Roblox Studio** — download from [roblox.com/create](https://www.roblox.com/create)
2. **Rojo** — install the VS Code extension *or* the CLI:
   ```bash
   # Via Aftman (recommended)
   aftman add rojo-rbx/rojo

   # Or via Foreman
   foreman install
   ```
3. **Rojo Roblox Studio plugin** — install from within Roblox Studio (Plugins → Manage Plugins → search "Rojo")

## Getting Started

```bash
# 1. Clone the repo and navigate to the project
git clone https://github.com/manu-labs/agent-team-workspace.git
cd agent-team-workspace/operation-greenland

# 2. Start the Rojo dev server
rojo serve

# 3. In Roblox Studio, open the Rojo plugin and click "Connect"
#    Studio will live-sync all file changes automatically.
```

## Folder Structure

```
operation-greenland/
├── default.project.json        # Rojo project config
├── README.md
└── src/
    ├── server/                 # → ServerScriptService  (server-only code)
    │   └── init.server.luau    #   Bootstrap Script (auto-runs on server)
    ├── client/                 # → StarterPlayerScripts  (per-player client code)
    │   └── init.client.luau    #   Bootstrap LocalScript (auto-runs per player)
    ├── shared/                 # → ReplicatedStorage  (modules shared by server + client)
    │   └── init.luau           #   ModuleScript (stateless data & utilities)
    └── ui/                     # → StarterGui  (UI screens and HUD widgets)
        └── init.client.luau    #   Bootstrap LocalScript (auto-runs per player)
```

### Rojo file naming conventions

| Extension | Roblox Instance | Use for |
|-----------|----------------|---------|
| `.server.luau` | Script | Server-side code that auto-runs |
| `.client.luau` | LocalScript | Client-side code that auto-runs |
| `.luau` | ModuleScript | Shared modules, systems, utilities (must be `require()`d) |

### Where things go

| Folder | Roblox Service | What belongs here |
|--------|---------------|-------------------|
| `src/server/` | ServerScriptService | GameManager, ShipSystem, CombatSystem, TerritorySystem, HazardSystem |
| `src/client/` | StarterPlayerScripts | ShipController, CameraController |
| `src/shared/` | ReplicatedStorage | GameConfig, ShipConfig, Types, Utils — stateless data and utilities |
| `src/ui/` | StarterGui | HUD, Minimap, Scoreboard, ShipSelectionScreen |

## Rojo Config

`default.project.json` maps the `src/` tree into Roblox services:

- `src/server/` → `ServerScriptService.Server`
- `src/client/` → `StarterPlayer.StarterPlayerScripts.Client`
- `src/shared/` → `ReplicatedStorage.Shared`
- `src/ui/` → `StarterGui.UI`

The `init.server.luau` / `init.client.luau` files make their parent folders into Script / LocalScript instances. The `init.luau` in `shared/` makes it a ModuleScript. Sibling `.luau` files become child ModuleScripts.

## Development Workflow

1. Create a feature branch: `git checkout -b feature/<issue-number>-<short-name>`
2. Write Luau modules in the appropriate `src/` subdirectory
3. Run `rojo serve` and connect Roblox Studio to live-test
4. Push and open a PR referencing the issue number
