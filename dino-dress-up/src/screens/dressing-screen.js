/**
 * dressing-screen.js - Dressing room screen controller
 * ──────────────────────────────────────────────────────────────────────────
 * The main game view. Bridges state management to:
 *  - Scene sprite updates (add / remove clothing sprites on the dino)
 *  - ClothingPanel UI (sync applied items, category switching)
 *  - Toolbar UI (dino name, action buttons)
 *  - Canvas rendering with an idle bounce animation
 *
 * Responsibilities:
 *  - Load the selected dinosaur SVG into a centred canvas sprite
 *  - Wire up the clothing panel with category tabs and item thumbnails
 *  - Wire up the toolbar with clear / randomize / done actions
 *  - Subscribe to `appliedClothing` state and diff-sync sprites
 *  - Provide a subtle idle bounce animation on the dino sprite
 *
 * @module screens/dressing-screen
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

import { store }                         from '../state/store.js';
import {
  toggleClothing,
  clearAllClothing,
  randomizeOutfit,
  finishDressing,
  setActiveCategory,
  goBack,
}                                        from '../state/actions.js';
import { ClothingPanel }                 from '../ui/clothing-panel.js';
import { Toolbar }                       from '../ui/toolbar.js';
import { ASSET_MANIFEST }               from '../assets/asset-manifest.js';
import { DINO_PATHS }                    from '../assets/dino-paths.js';
import { CLOTHING_PATHS }               from '../assets/clothing-paths.js';
import { Scene }                         from '../core/scene.js';
import { Sprite }                        from '../core/sprite.js';
import { TextureManager }               from '../core/texture-manager.js';
import { rasterizeSVGPaths }             from '../utils/svg-rasterizer.js';
import { createElement, $ }             from '../utils/dom-helpers.js';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  Z_RANGES,
  IDLE_BOUNCE_AMPLITUDE,
  IDLE_BOUNCE_SPEED,
}                                        from '../utils/constants.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Scale factor for the dino sprite relative to the canvas */
const DINO_DISPLAY_SCALE = 1.5;

/** Target dino sprite size (pixels) */
const DINO_SPRITE_SIZE = 600;

/** Period of the idle bounce animation (ms) */
const BOUNCE_PERIOD_MS = 2000;

/** Amplitude of the idle bounce animation (pixels) */
const BOUNCE_AMPLITUDE = IDLE_BOUNCE_AMPLITUDE || 3;

// ─── DressingScreen Class ─────────────────────────────────────────────────────

export class DressingScreen {
  /**
   * Create a new DressingScreen controller.
   *
   * @param {Object} options
   * @param {HTMLElement}                          options.container      - The dressing screen container element
   * @param {import('../core/scene.js').Scene}     options.scene          - Shared scene graph
   * @param {import('../core/texture-manager.js').TextureManager} options.textureManager - Shared texture manager
   * @param {import('../core/renderer.js').Renderer} options.renderer    - Shared renderer instance
   */
  constructor({ container, scene, textureManager, renderer }) {
    /** @type {HTMLElement} */
    this._container = container;

    /** @type {import('../core/renderer.js').Renderer} */
    this._renderer = renderer;

    /** @type {import('../core/scene.js').Scene} */
    this._scene = scene;

    /** @type {import('../core/texture-manager.js').TextureManager} */
    this._textureManager = textureManager;

    /** @type {Sprite|null} The main dinosaur sprite */
    this._dinoSprite = null;

    /** @type {Map<string, Sprite>} itemId -> clothing Sprite */
    this._clothingSprites = new Map();

    /** @type {string|null} Currently loaded dino ID */
    this._currentDinoId = null;

    /** @type {number} Base Y position for the dino sprite (before bounce) */
    this._dinoBaseY = CANVAS_HEIGHT / 2 + 20;

    /** @type {ClothingPanel|null} Sidebar clothing panel instance */
    this._clothingPanel = null;

    /** @type {Toolbar|null} Toolbar instance */
    this._toolbar = null;

    /** @type {Function[]} Store unsubscribe handles */
    this._unsubscribers = [];

    /** @type {boolean} Whether the idle animation is active */
    this._animating = false;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Initialize subscriptions and UI wiring.
   *
   * Called once after construction. Sets up store listeners for
   * `selectedDino` and `appliedClothing` state changes, and wires
   * the toolbar action buttons.
   */
  init() {
    // React to dino selection changes
    this._unsubscribers.push(
      store.subscribe('selectedDino', (state) => {
        this._loadDino(state.selectedDino);
      }),
    );

    // React to clothing changes
    this._unsubscribers.push(
      store.subscribe('appliedClothing', (state) => {
        this._syncClothingSprites(state.appliedClothing);
      }),
    );

    this._setupToolbar();
    this._setupClothingPanel();
  }

  /**
   * Show the dressing screen.
   *
   * Loads the currently selected dino, sets up the clothing panel
   * and toolbar, and starts the idle bounce animation.
   */
  show() {
    this._container.classList.remove('hidden');

    const state = store.getState();
    if (state.selectedDino) {
      this._loadDino(state.selectedDino);
    }

    // Sync the panel with current applied clothing
    if (this._clothingPanel) {
      this._clothingPanel.setAppliedItems(state.appliedClothing || []);
    }

    // Update toolbar dino name
    if (this._toolbar && state.selectedDino) {
      const dinoData = DINO_PATHS[state.selectedDino];
      if (dinoData) {
        this._toolbar.setDinoName(dinoData.name || state.selectedDino);
      }
      this._toolbar.setAppliedCount((state.appliedClothing || []).length);
    }

    this._startAnimation();
  }

  /**
   * Hide the dressing screen and pause animations.
   */
  hide() {
    this._container.classList.add('hidden');
    this._stopAnimation();
  }

  /**
   * Clean up all subscriptions, sprites, and child components.
   * Call this when the screen is being permanently removed.
   */
  destroy() {
    this._stopAnimation();

    // Unsubscribe from store
    for (const unsub of this._unsubscribers) {
      try { unsub(); } catch (_) { /* ignore */ }
    }
    this._unsubscribers = [];

    // Remove all clothing sprites
    this._clearAllClothingSprites();

    // Remove dino sprite
    if (this._dinoSprite) {
      this._scene.removeSprite(this._dinoSprite);
      this._renderer.releaseSpriteResources(this._dinoSprite.id);
      this._dinoSprite = null;
    }

    // Destroy UI components
    if (this._clothingPanel) {
      this._clothingPanel.destroy();
      this._clothingPanel = null;
    }
    if (this._toolbar) {
      this._toolbar.destroy();
      this._toolbar = null;
    }

    this._currentDinoId = null;
  }

  // ── Screen Manager Hooks ───────────────────────────────────────────────────

  /**
   * Called by the ScreenManager when this screen becomes active.
   * Starts the renderer and marks the scene as dirty.
   */
  onEnter() {
    this._renderer.start();
    this._startAnimation();
    this._scene.markDirty();
  }

  /**
   * Called by the ScreenManager when this screen is hidden.
   */
  onExit() {
    this._stopAnimation();
  }

  // ── Private — Dino Loading ─────────────────────────────────────────────────

  /**
   * Load a dinosaur SVG into the scene as a centred sprite.
   *
   * The dino is rendered at DINO_DISPLAY_SCALE (1.5x) within the
   * CANVAS_WIDTH x CANVAS_HEIGHT canvas, producing a ~600x600 sprite
   * centred in an 800x800 space. The z-index is set from Z_RANGES.BODY.
   *
   * @private
   * @param {string|null} dinoId - Dino identifier (e.g. "trex")
   */
  async _loadDino(dinoId) {
    if (!dinoId || dinoId === this._currentDinoId) return;

    // Remove previous dino
    if (this._dinoSprite) {
      this._scene.removeSprite(this._dinoSprite);
      this._renderer.releaseSpriteResources(this._dinoSprite.id);
      this._dinoSprite = null;
    }

    // Clear any existing clothing when dino changes
    this._clearAllClothingSprites();

    const dinoData = DINO_PATHS[dinoId];
    if (!dinoData) {
      console.warn('DressingScreen: unknown dino ID "' + dinoId + '"');
      return;
    }

    // Load SVG into a GPU texture
    const textureId = 'dino-' + dinoId;
    await this._textureManager.loadSVG(textureId, {
      paths:  dinoData.paths,
      width:  dinoData.width,
      height: dinoData.height,
    });

    // Calculate scale to produce a ~600px sprite (1.5x in 800px canvas)
    const targetSize = Math.min(DINO_SPRITE_SIZE, CANVAS_WIDTH * 0.75);
    const scale = Math.min(
      targetSize / dinoData.width,
      targetSize / dinoData.height,
    );

    this._dinoSprite = new Sprite({
      textureId,
      x:       CANVAS_WIDTH / 2,
      y:       this._dinoBaseY,
      width:   dinoData.width * scale,
      height:  dinoData.height * scale,
      zIndex:  Z_RANGES.BODY.min + 5,
      label:   'dino-' + dinoId,
      anchorX: 0.5,
      anchorY: 0.5,
    });

    this._scene.add(this._dinoSprite);
    this._currentDinoId = dinoId;
    this._scene.markDirty();

    // Update toolbar name
    if (this._toolbar) {
      this._toolbar.setDinoName(dinoData.name || dinoId);
    }
  }

  // ── Private — Clothing Panel Setup ─────────────────────────────────────────

  /**
   * Create and wire the ClothingPanel component.
   *
   * Renders category tabs from ASSET_MANIFEST and provides item
   * thumbnails for each category. Item clicks dispatch `toggleClothing`;
   * category switches dispatch `setActiveCategory`.
   *
   * @private
   */
  _setupClothingPanel() {
    const sidebarEl = $('#sidebar', this._container) || $('#sidebar');
    if (!sidebarEl) return;

    // Build a flat items array from the manifest's clothing map
    const items = Object.entries(ASSET_MANIFEST.clothing || {}).map(
      ([id, meta]) => ({ id, ...meta }),
    );

    const manifest = {
      categories: ASSET_MANIFEST.categories || [],
      items,
    };

    this._clothingPanel = new ClothingPanel(sidebarEl, manifest, {
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

    // Sync the panel when appliedClothing changes
    this._unsubscribers.push(
      store.subscribe('appliedClothing', (state) => {
        if (this._clothingPanel) {
          this._clothingPanel.setAppliedItems(state.appliedClothing || []);
        }
        if (this._toolbar) {
          this._toolbar.setAppliedCount((state.appliedClothing || []).length);
        }
      }),
    );
  }

  // ── Private — Toolbar Setup ────────────────────────────────────────────────

  /**
   * Create and wire the Toolbar component.
   *
   * Displays the dino name and provides action buttons:
   *  - Back     -> `goBack()`
   *  - Clear    -> `clearAllClothing()`
   *  - Randomize-> `randomizeOutfit()`
   *  - Done     -> `finishDressing()`
   *
   * @private
   */
  _setupToolbar() {
    const toolbarEl = $('#toolbar', this._container) || $('#toolbar');
    if (!toolbarEl) return;

    const state   = store.getState();
    const dinoId  = state.selectedDino;
    const dinoData = dinoId ? DINO_PATHS[dinoId] : null;

    this._toolbar = new Toolbar(toolbarEl, {
      dinoName:    dinoData ? dinoData.name : '',
      onBack:      () => goBack(),
      onClearAll:  () => clearAllClothing(),
      onRandomize: () => randomizeOutfit(),
      onDone:      () => finishDressing(),
    });

    this._toolbar.setAppliedCount((state.appliedClothing || []).length);
  }

  // ── Private — Clothing Sprite Sync ─────────────────────────────────────────

  /**
   * Diff the current clothing sprites against the applied clothing state.
   *
   * Removes sprites for items no longer applied; adds sprites for newly
   * applied items. This is the core sync loop that keeps the canvas in
   * agreement with the store.
   *
   * @private
   * @param {string[]} appliedClothing - Current applied item IDs from state
   */
  async _syncClothingSprites(appliedClothing) {
    const appliedSet = new Set(appliedClothing);

    // Remove sprites that are no longer in the applied set
    for (const [itemId, sprite] of this._clothingSprites) {
      if (!appliedSet.has(itemId)) {
        this._removeClothingSprite(itemId);
      }
    }

    // Add sprites for newly applied items
    for (const itemId of appliedClothing) {
      if (!this._clothingSprites.has(itemId)) {
        await this._addClothingSprite(itemId);
      }
    }

    this._scene.markDirty();
  }

  /**
   * Create a clothing sprite from CLOTHING_PATHS data and position it
   * on the dino using the slot coordinates from DINO_PATHS and the
   * offset from ASSET_MANIFEST.
   *
   * @private
   * @param {string} itemId - Clothing item identifier
   */
  async _addClothingSprite(itemId) {
    const meta     = ASSET_MANIFEST.clothing[itemId];
    const pathData = CLOTHING_PATHS[itemId];

    if (!meta || !pathData || !this._dinoSprite || !this._currentDinoId) {
      return;
    }

    const dinoData = DINO_PATHS[this._currentDinoId];
    if (!dinoData || !dinoData.slots) return;

    // Resolve the attachment slot on the dino
    const slot = dinoData.slots[meta.slot];
    if (!slot) {
      console.warn(
        'DressingScreen: slot "' + meta.slot + '" not found on dino "' +
        this._currentDinoId + '" for item "' + itemId + '"',
      );
      return;
    }

    // Load the clothing texture
    const textureId = 'clothing-' + itemId;
    await this._textureManager.loadSVG(textureId, {
      paths:  pathData.paths,
      width:  pathData.width,
      height: pathData.height,
    });

    // Calculate positioning: dino scale * item scale, then slot + offset
    const dinoScale = this._dinoSprite.width / dinoData.width;
    const itemScale = (meta.scale || 1) * dinoScale;

    const dinoLeft = this._dinoSprite.x - this._dinoSprite.width * this._dinoSprite.anchorX;
    const dinoTop  = this._dinoSprite.y - this._dinoSprite.height * this._dinoSprite.anchorY;

    const offsetX = meta.offset ? meta.offset.x : 0;
    const offsetY = meta.offset ? meta.offset.y : 0;

    const itemX = dinoLeft + slot.x * dinoScale + offsetX * dinoScale;
    const itemY = dinoTop  + slot.y * dinoScale + offsetY * dinoScale;

    const sprite = new Sprite({
      textureId,
      x:       itemX + (pathData.width * itemScale) / 2,
      y:       itemY + (pathData.height * itemScale) / 2,
      width:   pathData.width * itemScale,
      height:  pathData.height * itemScale,
      zIndex:  meta.zIndex || Z_RANGES.UPPER_CLOTHING.min,
      label:   'clothing-' + itemId,
      anchorX: 0.5,
      anchorY: 0.5,
    });

    // Store the base Y for the bounce animation
    sprite._baseY = sprite.y;

    this._scene.add(sprite);
    this._clothingSprites.set(itemId, sprite);
  }

  /**
   * Remove a clothing sprite from the scene and clean up its resources.
   *
   * @private
   * @param {string} itemId - Clothing item identifier
   */
  _removeClothingSprite(itemId) {
    const sprite = this._clothingSprites.get(itemId);
    if (!sprite) return;

    this._scene.removeSprite(sprite);
    this._renderer.releaseSpriteResources(sprite.id);
    this._clothingSprites.delete(itemId);
  }

  /**
   * Remove all clothing sprites from the scene.
   *
   * @private
   */
  _clearAllClothingSprites() {
    for (const [itemId, sprite] of this._clothingSprites) {
      this._scene.removeSprite(sprite);
      this._renderer.releaseSpriteResources(sprite.id);
    }
    this._clothingSprites.clear();
  }

  // ── Private — Idle Bounce Animation ────────────────────────────────────────

  /**
   * Start the idle bounce animation loop.
   *
   * Applies a subtle sine-wave displacement to the dino sprite (and all
   * attached clothing sprites) on every animation frame. The effect is
   * a gentle breathing / hovering motion.
   *
   * Parameters:
   *  - Amplitude: BOUNCE_AMPLITUDE (default 3px)
   *  - Period:    BOUNCE_PERIOD_MS (2 seconds per full cycle)
   *
   * @private
   */
  _startAnimation() {
    if (this._animating) return;
    this._animating = true;

    this._renderer.onFrame = (timestamp) => {
      if (!this._animating || !this._dinoSprite) return;
      this._updateIdleBounce(timestamp);
    };
  }

  /**
   * Stop the idle bounce animation.
   *
   * @private
   */
  _stopAnimation() {
    this._animating = false;
    if (this._renderer) {
      this._renderer.onFrame = null;
    }
  }

  /**
   * Apply the idle bounce displacement for the current frame.
   *
   * Uses a sine wave based on the timestamp to produce smooth vertical
   * oscillation. Both the dino sprite and all clothing sprites are
   * moved together to maintain visual coherence.
   *
   * @private
   * @param {number} timestamp - High-resolution timestamp from requestAnimationFrame
   */
  _updateIdleBounce(timestamp) {
    const bounce = Math.sin(timestamp * (IDLE_BOUNCE_SPEED || (Math.PI * 2 / BOUNCE_PERIOD_MS)))
                   * BOUNCE_AMPLITUDE;

    // Move dino sprite
    const newDinoY = this._dinoBaseY + bounce;
    this._dinoSprite.setPosition(this._dinoSprite.x, newDinoY);

    // Move all clothing sprites in sync
    for (const [_itemId, sprite] of this._clothingSprites) {
      if (sprite._baseY !== undefined) {
        sprite.setPosition(sprite.x, sprite._baseY + bounce);
      }
    }

    this._scene.markDirty();
  }
}