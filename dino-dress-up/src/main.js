/**
 * main.js - Application Bootstrap & Integration
 * Dino Dress-Up Game
 *
 * Wires together: WebGPU rendering, SVG assets, state management,
 * screen controllers, and UI components into a complete playable game.
 */

import { initGPUContext } from "./core/gpu-context.js";
import { Renderer } from "./core/renderer.js";
import { TextureManager } from "./core/texture-manager.js";
import { Scene } from "./core/scene.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./utils/constants.js";

import { store } from "./state/store.js";
import {
  setLoadingProgress,
  setRenderMode,
  toggleClothing,
  setActiveCategory,
  clearAllClothing,
} from "./state/actions.js";
import { ASSET_MANIFEST } from "./assets/asset-manifest.js";

import { ScreenManager } from "./screens/screen-manager.js";
import { SelectScreen } from "./screens/select-screen.js";
import { DressingScreen } from "./screens/dressing-screen.js";
import { FinishedScreen } from "./screens/finished-screen.js";

import { ClothingPanel } from "./ui/clothing-panel.js";

// -- Main Bootstrap --

async function init() {
  console.log("Dino Dress-Up - Initializing...");

  // -- Loading UI --
  const loadingOverlay = document.getElementById("loading-overlay");
  const loadingBar = document.getElementById("loading-bar");
  const loadingStatus = document.getElementById("loading-status");
  const appRoot = document.getElementById("app");

  function updateLoading(progress, message) {
    setLoadingProgress(progress, message);
    if (loadingBar) loadingBar.style.width = (progress * 100) + "%";
    if (loadingStatus) loadingStatus.textContent = message;
  }

  updateLoading(0.1, "Initializing graphics...");

  // -- Initialize GPU --
  const canvas = document.getElementById("dino-canvas");
  if (!canvas) {
    console.error("Canvas element #dino-canvas not found!");
    return;
  }

  let gpuContext;
  try {
    gpuContext = await initGPUContext(canvas);
  } catch (err) {
    console.error("GPU initialization failed:", err);
    const noWebGPU = document.getElementById("no-webgpu");
    if (noWebGPU) noWebGPU.classList.remove("hidden");
    if (loadingOverlay) loadingOverlay.classList.add("hidden");
    return;
  }

  setRenderMode(gpuContext.mode);
  console.log("Rendering mode: " + gpuContext.mode);

  // Show fallback notice if Canvas2D
  if (gpuContext.mode !== "webgpu") {
    const noWebGPU = document.getElementById("no-webgpu");
    // For Canvas2D fallback, we still continue but show a subtle notice
    if (noWebGPU) {
      noWebGPU.innerHTML = "<div class=\"no-webgpu-content\"><p>Using Canvas2D fallback. For best experience, use Chrome 113+.</p></div>";
      noWebGPU.classList.remove("hidden");
    }
  }

  updateLoading(0.3, "Setting up renderer...");

  // -- Create Core Systems --
  const textureManager = new TextureManager(
    gpuContext.mode === "webgpu" ? gpuContext.device : null
  );
  const scene = new Scene();
  const renderer = new Renderer(gpuContext, textureManager);
  renderer.setScene(scene);

  updateLoading(0.5, "Loading dinosaur data...");

  // -- Initialize Screen Manager --
  const screenManager = new ScreenManager();

  // -- Initialize Screen Controllers --
  const selectScreenEl = document.getElementById("screen-selection");
  const dressingScreenEl = document.getElementById("screen-dressing");
  const finishedScreenEl = document.getElementById("screen-finished");

  const selectScreen = new SelectScreen({
    container: selectScreenEl,
  });

  const dressingScreen = new DressingScreen({
    container: dressingScreenEl,
    scene,
    textureManager,
    renderer,
  });

  const finishedScreen = new FinishedScreen({
    container: finishedScreenEl,
    renderer,
  });

  updateLoading(0.7, "Setting up UI...");

  // -- Initialize UI Components --
  // Transform ASSET_MANIFEST.clothing object into items array for ClothingPanel
  const clothingItems = Object.entries(ASSET_MANIFEST.clothing).map(([id, meta]) => ({
    id,
    ...meta,
  }));

  const panelManifest = {
    categories: ASSET_MANIFEST.categories,
    items: clothingItems,
  };

  const sidebar = document.getElementById("sidebar");
  let clothingPanel = null;

  if (sidebar) {
    clothingPanel = new ClothingPanel(sidebar, panelManifest, {
      onItemClick: (itemId) => {
        toggleClothing(itemId);
      },
      onCategoryChange: (categoryId) => {
        setActiveCategory(categoryId);
      },
      onClearAll: () => {
        clearAllClothing();
      },
    });
  }

  // -- Connect State to UI --
  // Sync applied clothing to the panel
  store.subscribe("appliedClothing", (state) => {
    if (clothingPanel) {
      clothingPanel.setAppliedItems(state.appliedClothing);
    }

    // Update stats bar
    const statItemCount = document.getElementById("stat-item-count");
    if (statItemCount) {
      const count = state.appliedClothing.length;
      statItemCount.textContent = count === 0 ? "0 items worn"
        : count === 1 ? "1 item worn"
        : count + " items worn";
    }
  });

  // Sync dino name to stats bar
  store.subscribe("selectedDino", (state) => {
    const statDinoName = document.getElementById("stat-dino-name");
    if (statDinoName && state.selectedDino) {
      const dinoInfo = ASSET_MANIFEST.dinosaurs.find(d => d.id === state.selectedDino);
      statDinoName.textContent = dinoInfo ? dinoInfo.name : state.selectedDino;
    }
  });

  // Sync active category to panel
  store.subscribe("activeCategory", (state) => {
    if (clothingPanel) {
      clothingPanel.setCategory(state.activeCategory);
    }
  });

  updateLoading(0.9, "Almost ready...");

  // -- Initialize all screen controllers --
  selectScreen.init();
  dressingScreen.init();
  finishedScreen.init();

  // -- Register screen enter/exit callbacks --
  screenManager.onEnter("select", () => selectScreen.onEnter());
  screenManager.onExit("select", () => selectScreen.onExit());
  screenManager.onEnter("dressing", () => dressingScreen.onEnter());
  screenManager.onExit("dressing", () => dressingScreen.onExit());
  screenManager.onEnter("finished", () => finishedScreen.onEnter());
  screenManager.onExit("finished", () => finishedScreen.onExit());

  // -- Start screen manager (shows selection screen) --
  screenManager.init();

  // -- Done loading --
  updateLoading(1.0, "Ready!");

  // Hide loading overlay, show app
  setTimeout(() => {
    if (loadingOverlay) {
      loadingOverlay.classList.add("fade-out");
      setTimeout(() => {
        loadingOverlay.classList.add("hidden");
      }, 400);
    }
    if (appRoot) {
      appRoot.classList.remove("hidden");
    }
  }, 300);

  console.log("Dino Dress-Up - Ready! Have fun dressing up dinosaurs!");
}

// -- Boot --
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
