# 🦖 Dino Dress-Up

A WebGPU-powered dinosaur dressing game! Choose from 3 adorable dinosaur characters and dress them up with 46+ clothing items across 8 categories.

## 🌐 Live Demo

**[Play it here → https://manu-labs.github.io/agent-team-workspace/](https://manu-labs.github.io/agent-team-workspace/)**

> Requires a WebGPU-capable browser: Chrome 113+, Edge 113+, or Chrome on Android 121+

## Features

- **3 Dinosaur Characters**: Rex (T-Rex), Cera (Triceratops), and Steggy (Stegosaurus)
- **8 Clothing Categories**: Hats, Eyewear, Neckwear, Tops, Capes, Footwear, Accessories, Tail Flair
- **46+ Clothing Items**: From top hats to bunny slippers
- **WebGPU Rendering**: GPU-accelerated 2D sprite compositing with smooth animations
- **Canvas2D Fallback**: Works in browsers without WebGPU support
- **No Build Step Required**: Pure ES modules, deploy as static files
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- WebGPU for GPU-accelerated 2D rendering
- Vanilla JavaScript (ES modules, no framework)
- Programmatic SVG-to-texture asset pipeline (zero external images)
- HTML/CSS overlay for UI controls

## Getting Started (Local Development)

1. Serve the `dino-dress-up/` folder with any static file server
2. Open in a WebGPU-capable browser (Chrome 113+, Edge 113+)
3. Pick a dino, dress them up, and have fun!

```bash
# Using Python
cd dino-dress-up && python -m http.server 8080

# Using Node
npx serve dino-dress-up
```

> **Note:** WebGPU requires HTTPS or localhost. The local dev server on localhost works fine.

## Project Structure

```
dino-dress-up/
├── index.html              # Entry point
├── style.css               # All styles
├── src/
│   ├── main.js             # App bootstrap
│   ├── core/               # WebGPU rendering engine
│   ├── state/              # Reactive state management
│   ├── screens/            # Screen controllers
│   ├── ui/                 # UI components
│   ├── assets/             # Programmatic SVG asset data
│   └── utils/              # Utility functions
└── README.md
```

## Deployment

The game is automatically deployed to GitHub Pages via GitHub Actions on every push to `main` that touches the `dino-dress-up/` directory.

**Deployment pipeline:**
- Workflow: `.github/workflows/deploy-dino-dress-up.yml`
- Trigger: Push to `main` (paths: `dino-dress-up/**`) or manual dispatch
- Deploys to: `gh-pages` branch → served at `https://manu-labs.github.io/agent-team-workspace/`
- HTTPS is enforced (required for WebGPU)

### Manual Deploy

Go to the [Actions tab](https://github.com/manu-labs/agent-team-workspace/actions/workflows/deploy-dino-dress-up.yml) and click **"Run workflow"**.
