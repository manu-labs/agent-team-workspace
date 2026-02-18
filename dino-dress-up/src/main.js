/**
 * main.js — Application bootstrap & integration
 * Issue #16: Wire rendering engine + state + UI + assets into a working game.
 *
 * This is the single entry point loaded by index.html via <script type="module">.
 * It orchestrates initialisation in this order:
 *   1. WebGPU / Canvas2D context
 *   2. Asset preloading (dino + clothing SVGs)
 *   3. State store + actions
 *   4. Screen manager + screen controllers
 *   5. UI components (ClothingPanel, Toolbar, DragDrop)
 *   6. Render loop start
 */

// ── Core engine ──────────────────────────────────────────────────────────
import { initGPUContext } from './core/gpu-context.js';
import { Renderer } from './core/renderer.js';
import { TextureManager } from './core/texture-manager.js';
import { Scene } from './core/scene.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './utils/constants.js';

// ── State ────────────────────────────────────────────────────────────────
import { store } from './state/store.js';
import {
  selectDino,
  toggleClothing,
  clearAllClothing,
  randomizeOutfit,
  setActiveCategory,
  finishDressing,
  goBack,
  dressAgain,
  startOver,
  setLoadingProgress,
  setRenderMode,
} from './state/actions.js';

// ── Assets ───────────────────────────────────────────────────────────────
import { ASSET_MANIFEST } from './assets/asset-manifest.js';
import { DINO_PATHS } from './assets/dino-paths.js';
import { CLOTHING_PATHS } from './assets/clothing-paths.js';

// ── Screens ──────────────────────────────────────────────────────────────
import { ScreenManager } from './screens/screen-manager.js';
import { SelectScreen } from './screens/select-screen.js';
import { DressingScreen } from './screens/dressing-screen.js';
import { FinishedScreen } from './screens/finished-screen.js';

// ── UI Components ────────────────────────────────────────────────────────
import { ClothingPanel } from './ui/clothing-panel.js';
import { Toolbar } from './ui/toolbar.js';
import { DragDropHandler } from './ui/drag-drop.js';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transform ASSET_MANIFEST.clothing (object keyed by id) into the flat
 * array format that ClothingPanel expects: [{ id, name, category, ... }]
 */
function buildItemsArray() {
  return Object.entries(ASSET_MANIFEST.clothing).map(([id, meta]) => ({
    id,
    ...meta,
  }));
}

/**
 * Update the loading overlay UI.
 * @param {number} progress  0-1
 * @param {string} message
 */
function updateLoadingUI(progress, message) {
  const bar = document.getElementById('loading-bar');
  const status = document.getElementById('loading-status');
  if (bar) bar.style.width = Math.round(progress * 100) + '%';
  if (status) status.textContent = message;
  setLoadingProgress(progress, message);
}

/**
 * Hide the loading overlay and reveal the app.
 */
function showApp() {
  const overlay = document.getElementById('loading-overlay');
  const app = document.getElementById('app');
  if (overlay) overlay.classList.add('hidden');
  if (app) app.classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN INIT
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('🦖 Dino Dress-Up — Initializing...');
  updateLoadingUI(0, 'Starting up…');

  // ── 1. WebGPU / Canvas2D context ───────────────────────────────────────
  const canvas = document.getElementById('dino-canvas');
  if (!canvas) {
    console.error('Canvas element #dino-canvas not found!');
    return;
  }

  let gpuContext;
  try {
    gpuContext = await initGPUContext(canvas);
  } catch (err) {
    console.error('GPU init failed:', err);
    const noGpu = document.getElementById('no-webgpu');
    if (noGpu) noGpu.classList.remove('hidden');
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
    return;
  }

  console.log('Rendering mode:', gpuContext.mode);
  setRenderMode(gpuContext.mode);

  if (gpuContext.mode !== 'webgpu') {
    const banner = document.getElementById('no-webgpu');
    // Don't show the full blocker — Canvas2D is a valid fallback.
    // Just log it.
    console.info('Running in Canvas2D fallback mode.');
  }

  updateLoadingUI(0.1, 'Graphics ready…');

  // ── 2. Core engine objects ─────────────────────────────────────────────
  const textureManager = new TextureManager(
    gpuContext.mode === 'webgpu' ? gpuContext.device : null
  );
  const scene = new Scene();
  const renderer = new Renderer(gpuContext, textureManager);
  renderer.setScene(scene);

  updateLoadingUI(0.15, 'Loading dinosaurs…');

  // ── 3. Preload dinosaur textures ───────────────────────────────────────
  const dinoIds = Object.keys(DINO_PATHS);
  const totalAssets = dinoIds.length + Object.keys(CLOTHING_PATHS).length;
  let loadedCount = 0;

  for (const dinoId of dinoIds) {
    const dinoData = DINO_PATHS[dinoId];
    await textureManager.loadSVG('dino-' + dinoId, {
      paths: dinoData.paths,
      width: dinoData.width,
      height: dinoData.height,
    });
    loadedCount++;
    const progress = 0.15 + (loadedCount / totalAssets) * 0.7;
    updateLoadingUI(progress, 'Loading assets… (' + loadedCount + '/' + totalAssets + ')');
  }

  // ── 4. Preload clothing textures ───────────────────────────────────────
  updateLoadingUI(0.25, 'Loading clothing…');

  const clothingIds = Object.keys(CLOTHING_PATHS);
  for (const itemId of clothingIds) {
    const pathData = CLOTHING_PATHS[itemId];
    await textureManager.loadSVG('clothing-' + itemId, {
      paths: pathData.paths,
      width: pathData.width,
      height: pathData.height,
    });
    loadedCount++;
    const progress = 0.15 + (loadedCount / totalAssets) * 0.7;
    updateLoadingUI(progress, 'Loading assets… (' + loadedCount + '/' + totalAssets + ')');
  }

  updateLoadingUI(0.9, 'Setting up UI…');

  // ── 5. Screen Manager ─────────────────────────────────────────────────
  const screenManager = new ScreenManager();

  // ── 6. Select Screen ──────────────────────────────────────────────────
  const selectContainer = document.getElementById('screen-selection');
  const selectScreen = new SelectScreen({ container: selectContainer });
  selectScreen.init();

  screenManager.onEnter('select', () => selectScreen.onEnter());
  screenManager.onExit('select', () => selectScreen.onExit());

  // ── 7. Dressing Screen ────────────────────────────────────────────────
  const dressingContainer = document.getElementById('screen-dressing');
  const dressingScreen = new DressingScreen({
    container: dressingContainer,
    scene,
    textureManager,
    renderer,
  });
  dressingScreen.init();

  screenManager.onEnter('dressing', () => dressingScreen.onEnter());
  screenManager.onExit('dressing', () => dressingScreen.onExit());

  // ── 8. Toolbar ────────────────────────────────────────────────────────
  const toolbarContainer = document.getElementById('toolbar');
  const toolbar = new Toolbar(toolbarContainer, {
    onBack: () => {
      const state = store.getState();
      if (state.appliedClothing.length > 0) {
        if (confirm('You have items applied. Go back and lose your outfit?')) {
          goBack();
        }
      } else {
        goBack();
      }
    },
    onClearAll: () => clearAllClothing(),
    onRandomize: () => randomizeOutfit(),
    onDone: () => finishDressing(),
  });

  // ── 9. Clothing Panel ─────────────────────────────────────────────────
  const sidebarContainer = document.getElementById('sidebar');
  const clothingPanel = new ClothingPanel(sidebarContainer, {
    categories: ASSET_MANIFEST.categories,
    items: buildItemsArray(),
  }, {
    onItemClick: (itemId) => toggleClothing(itemId),
    onCategoryChange: (categoryId) => setActiveCategory(categoryId),
    onClearAll: () => clearAllClothing(),
  });

  // ── 10. Drag-Drop Handler ─────────────────────────────────────────────
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const dragDrop = new DragDropHandler(canvasWrapper, {
    onDrop: (itemId) => {
      // Dropping an item on the canvas is equivalent to clicking it.
      toggleClothing(itemId);
    },
  });
  dragDrop.enable();

  // ── 11. Finished Screen ───────────────────────────────────────────────
  const finishedContainer = document.getElementById('screen-finished');
  const finishedScreen = new FinishedScreen({
    container: finishedContainer,
    renderer,
  });
  finishedScreen.init();

  screenManager.onEnter('finished', () => finishedScreen.onEnter());
  screenManager.onExit('finished', () => finishedScreen.onExit());

  // ── 12. State → UI subscriptions ──────────────────────────────────────

  // Sync applied clothing to ClothingPanel + Toolbar badge
  store.subscribe('appliedClothing', (state) => {
    clothingPanel.setAppliedItems(state.appliedClothing);
    toolbar.setAppliedCount(state.appliedClothing.length);
  });

  // Sync active category to ClothingPanel
  store.subscribe('activeCategory', (state) => {
    clothingPanel.setCategory(state.activeCategory);
  });

  // Sync selected dino name to Toolbar
  store.subscribe('selectedDino', (state) => {
    if (state.selectedDino) {
      const dinoMeta = ASSET_MANIFEST.dinosaurs.find(d => d.id === state.selectedDino);
      toolbar.setDinoName(dinoMeta ? dinoMeta.name : state.selectedDino);
    }
  });

  // ── 13. Initialise Screen Manager (must be last) ──────────────────────
  screenManager.init();

  // ── 14. Start render loop ─────────────────────────────────────────────
  renderer.start();

  // ── 15. Reveal the app ────────────────────────────────────────────────
  updateLoadingUI(1, 'Ready!');
  // Small delay so the progress bar visually reaches 100%
  await new Promise((resolve) => setTimeout(resolve, 300));
  showApp();

  console.log('🦖 Dino Dress-Up — Ready!');
  console.log('Loaded ' + totalAssets + ' assets (' + gpuContext.mode + ' mode)');
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
