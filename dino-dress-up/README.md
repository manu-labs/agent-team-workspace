# Dino Dress-Up

A WebGPU-powered dinosaur dressing game! Choose from 3 adorable dinosaur characters and dress them up with 46+ clothing items across 8 categories.

## Play Now

Live URL: https://manu-labs.github.io/agent-team-workspace/

Requires a WebGPU-capable browser: Chrome 113+, Edge 113+, or Chrome on Android 113+

## Features

- 3 Dinosaur Characters: Rex (T-Rex), Cera (Triceratops), and Steggy (Stegosaurus)
- 8 Clothing Categories: Hats, Eyewear, Neckwear, Tops, Capes, Footwear, Accessories, Tail Flair
- 46+ Clothing Items: From top hats to bunny slippers
- WebGPU Rendering: GPU-accelerated 2D sprite compositing with smooth animations
- Canvas2D Fallback: Works in browsers without WebGPU support
- No Build Step Required: Pure ES modules, deploy as static files
- Responsive Design: Works on desktop, tablet, and mobile

## Tech Stack

- WebGPU for GPU-accelerated 2D rendering
- Vanilla JavaScript (ES modules, no framework)
- Programmatic SVG-to-texture asset pipeline (zero external images)
- HTML/CSS overlay for UI controls

## Getting Started (Local Development)

1. Serve the dino-dress-up/ folder with any static file server
2. Open in a WebGPU-capable browser (Chrome 113+, Edge 113+)
3. Pick a dino, dress them up, and have fun!

Run with Python: cd dino-dress-up && python -m http.server 8080
Run with Node: npx serve dino-dress-up

## Project Structure

dino-dress-up/
  index.html              - Entry point
  style.css               - All styles
  src/
    main.js               - App bootstrap
    core/                 - WebGPU rendering engine
    state/                - Reactive state management
    screens/              - Screen controllers
    ui/                   - UI components
    assets/               - Programmatic SVG asset data
    utils/                - Utility functions
  deployment/
    github-pages-workflow.yml  - GitHub Actions workflow template
  README.md

## Deployment (GitHub Pages)

The game deploys automatically via GitHub Actions on every push to main that modifies the dino-dress-up/ folder.

### GitHub Actions Workflow

The workflow template is at deployment/github-pages-workflow.yml.
Copy it to .github/workflows/deploy-dino-dress-up.yml to activate.

What it does:
1. Triggers on push to main (only when dino-dress-up/** files change) and on manual dispatch
2. Uploads the dino-dress-up/ folder as the Pages artifact (served at site root)
3. Deploys to GitHub Pages via the official actions/deploy-pages@v4 action

### GitHub Pages Settings Required

In the repository settings (Settings > Pages):
- Source: GitHub Actions
- HTTPS: Enforced (required for WebGPU)

### Why GitHub Actions instead of direct branch deploy?

- Serves dino-dress-up/ from the site root (not a /dino-dress-up/ subfolder)
- Correct MIME types for ES modules (text/javascript)
- HTTPS enforced automatically (required for WebGPU)
- Clean, reproducible deployments on every merge to main
