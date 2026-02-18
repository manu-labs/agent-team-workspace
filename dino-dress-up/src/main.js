/**
 * main.js - Application bootstrap
 * Initializes WebGPU, loads assets, sets up state, and starts the render loop.
 *
 * This is the entry point loaded by index.html via <script type="module">.
 */

import { initGPUContext } from "./core/gpu-context.js";
import { Renderer } from "./core/renderer.js";
import { TextureManager } from "./core/texture-manager.js";
import { Scene } from "./core/scene.js";
import { Sprite } from "./core/sprite.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./utils/constants.js";

async function init() {
  console.log("🦖 Dino Dress-Up — Initializing...");

  const canvas = document.getElementById("game-canvas");
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }

  // Initialize GPU context (WebGPU or Canvas2D fallback)
  const gpuContext = await initGPUContext(canvas);
  console.log(`Rendering mode: ${gpuContext.mode}`);

  // Show fallback banner if not using WebGPU
  if (gpuContext.mode !== "webgpu") {
    const banner = document.getElementById("fallback-banner");
    if (banner) banner.hidden = false;
  }

  // Create texture manager and scene
  const textureManager = new TextureManager(
    gpuContext.mode === "webgpu" ? gpuContext.device : null
  );
  const scene = new Scene();

  // Create renderer
  const renderer = new Renderer(gpuContext, textureManager);
  renderer.setScene(scene);

  // ─── Demo: render a test sprite ───────────────────
  // Create a simple test texture (colored square) to prove the pipeline works
  const testPaths = [
    { d: "M 10 10 L 90 10 L 90 90 L 10 90 Z", fill: "#4caf50" },
    { d: "M 30 30 L 70 30 L 70 70 L 30 70 Z", fill: "#81c784" },
    { d: "M 45 20 L 55 20 L 55 80 L 45 80 Z", fill: "#2e7d32" },
    { d: "M 20 45 L 80 45 L 80 55 L 20 55 Z", fill: "#2e7d32" },
  ];

  await textureManager.loadSVG("test-sprite", {
    paths: testPaths,
    width: 100,
    height: 100,
  });

  const testSprite = new Sprite({
    textureId: "test-sprite",
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    width: 200,
    height: 200,
    zIndex: 5,
    label: "test-quad",
  });

  scene.add(testSprite);

  // Start render loop
  renderer.start();

  console.log("🦖 Dino Dress-Up — Ready!");
  console.log(`Scene has ${scene.size} sprite(s)`);
}

// Boot when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
