# Dino Dress-Up

A WebGPU-powered dinosaur dressing game! Choose from 3 adorable dinosaur characters and dress them up with 46+ clothing items across 8 categories.

## Play Now

https://manu-labs.github.io/agent-team-workspace/

Requires a WebGPU-capable browser: Chrome 113+, Edge 113+, or Chrome on Android 113+

## Features

- 3 Dinosaur Characters: Rex (T-Rex), Cera (Triceratops), and Steggy (Stegosaurus)
- 8 Clothing Categories: Hats, Eyewear, Neckwear, Tops, Capes, Footwear, Accessories, Tail Flair
- 46+ Clothing Items: From top hats to bunny slippers
- WebGPU Rendering: GPU-accelerated 2D sprite compositing
- Canvas2D Fallback: Works in browsers without WebGPU support
- No Build Step Required: Pure ES modules, deploy as static files

## Tech Stack

- WebGPU for GPU-accelerated 2D rendering
- Vanilla JavaScript (ES modules, no framework)
- Programmatic SVG-to-texture asset pipeline (zero external images)
- HTML/CSS overlay for UI controls

## Local Development

Serve the dino-dress-up/ folder with any static file server then open in Chrome 113+.

Using Python: python -m http.server 8080
Using Node: npx serve .

## Deployment

Deployed automatically via GitHub Actions on every push to main that touches dino-dress-up/**.

Workflow: .github/workflows/deploy-dino-dress-up.yml
Live URL: https://manu-labs.github.io/agent-team-workspace/
