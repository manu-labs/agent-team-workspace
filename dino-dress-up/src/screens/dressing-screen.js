/**
 * dressing-screen.js - Dressing room screen controller
 * Part of the Dino Dress-Up screen system
 *
 * Bridges the state store ↔ renderer ↔ UI components.
 * When clothing state changes, updates the scene sprites.
 * When UI events fire, dispatches state actions.
 */

import { store } from "../state/store.js";
import {
  toggleClothing,
  clearAllClothing,
  randomizeOutfit,
  setActiveCategory,
  finishDressing,
  goToSelection,
} from "../state/actions.js";
import { ASSET_MANIFEST } from "../assets/asset-manifest.js";
import { DINO_PATHS } from "../assets/dino-paths.js";
import { CLOTHING_PATHS } from "../assets/clothing-paths.js";
import { Sprite } from "../core/sprite.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, IDLE_BOUNCE_AMPLITUDE, IDLE_BOUNCE_SPEED } from "../utils/constants.js";
import { ClothingPanel } from "../ui/clothing-panel.js";
import { Toolbar } from "../ui/toolbar.js";

export class DressingScreen {
  /**
   * @param {HTMLElement} containerEl
   * @param {Object} deps - Dependencies injected from main.js
   * @param {import("../core/renderer.js").Renderer} deps.renderer
   * @param {import("../core/scene.js").Scene} deps.scene
   * @param {import("../core/texture-manager.js").TextureManager} deps.textureManager
   */
  constructor(containerEl, deps) {
    this._container = containerEl;
    this._renderer = deps.renderer;
    this._scene = deps.scene;
    this._textureManager = deps.textureManager;

    /** @type {Sprite|null} */
    this._dinoSprite = null;

    /** @type {Map<string, Sprite>} itemId → Sprite */
    this._clothingSprites = new Map();

    /** @type {ClothingPanel|null} */
    this._clothingPanel = null;

    /** @type {Toolbar|null} */
    this._toolbar = null;

    /** @type {Function[]} */
    this._unsubscribers = [];
  }

  /**
   * Initialize the dressing screen.
   * Sets up UI components and subscribes to state changes.
   */
  async init() {
    // Set up clothing panel
    const sidebarEl = this._container.querySelector("#sidebar");
    if (sidebarEl) {
      // Build items array from manifest for the panel
      const items = Object.entries(ASSET_MANIFEST.clothing).map(
        ([id, meta]) => ({
          id,
          name: meta.name,
          category: meta.category,
          order: meta.zIndex,
        })
      );

      this._clothingPanel = new ClothingPanel(sidebarEl, {
        categories: ASSET_MANIFEST.categories,
        items,
      }, {
        onItemClick: (itemId) => toggleClothing(itemId),
        onCategoryChange: (catId) => setActiveCategory(catId),
        onClearAll: () => clearAllClothing(),
      });
    }

    // Set up toolbar
    const toolbarEl = this._container.querySelector("#toolbar");
    if (toolbarEl) {
      this._toolbar = new Toolbar(toolbarEl, {
        onBack: () => this._handleBack(),
        onClearAll: () => clearAllClothing(),
        onRandomize: () => randomizeOutfit(),
        onDone: () => finishDressing(),
      });
    }

    // Subscribe to state changes
    this._unsubscribers.push(
      store.subscribe("selectedDino", (state) => this._onDinoChanged(state)),
      store.subscribe("appliedClothing", (state) => this._onClothingChanged(state)),
      store.subscribe("activeCategory", (state) => {
        if (this._clothingPanel) {
          this._clothingPanel.setCategory(state.activeCategory);
        }
      })
    );

    // Set up idle bounce animation
    this._renderer.onFrame = (timestamp) => {
      if (this._dinoSprite) {
        const bounce = Math.sin(timestamp * IDLE_BOUNCE_SPEED) * IDLE_BOUNCE_AMPLITUDE;
        this._dinoSprite.setPosition(
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + bounce
        );
        this._scene.markDirty();

        // Also bounce clothing sprites to match
        this._clothingSprites.forEach((sprite) => {
          const baseY = sprite._baseY || sprite.y;
          sprite.setPosition(sprite.x, baseY + bounce);
        });
      }
    };
  }

  /**
   * Called when the selected dinosaur changes.
   * Loads the dino texture and creates its sprite.
   */
  async _onDinoChanged(state) {
    const dinoId = state.selectedDino;
    if (\!dinoId) return;

    const dinoData = DINO_PATHS[dinoId];
    if (\!dinoData) return;

    // Clear existing sprites
    this._clearScene();

    // Load dino texture
    const textureId = `dino-${dinoId}`;
    await this._textureManager.loadSVG(textureId, {
      paths: dinoData.paths,
      width: dinoData.width,
      height: dinoData.height,
    });

    // Create dino sprite centered on canvas
    const scale = Math.min(
      (CANVAS_WIDTH * 0.6) / dinoData.width,
      (CANVAS_HEIGHT * 0.7) / dinoData.height
    );

    this._dinoSprite = new Sprite({
      textureId,
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      width: dinoData.width * scale,
      height: dinoData.height * scale,
      zIndex: 5,
      label: `dino-${dinoId}`,
    });

    this._scene.add(this._dinoSprite);
    this._scene.markDirty();

    // Update toolbar
    if (this._toolbar) {
      this._toolbar.setDinoName(dinoData.name);
      this._toolbar.setAppliedCount(0);
    }

    // Re-apply any existing clothing
    if (state.appliedClothing.length > 0) {
      this._onClothingChanged(state);
    }
  }

  /**
   * Called when applied clothing changes.
   * Syncs clothing sprites with the current state.
   */
  async _onClothingChanged(state) {
    const applied = new Set(state.appliedClothing);
    const dinoId = state.selectedDino;
    const dinoData = dinoId ? DINO_PATHS[dinoId] : null;

    if (\!dinoData || \!this._dinoSprite) return;

    // Remove sprites for items no longer applied
    for (const [itemId, sprite] of this._clothingSprites) {
      if (\!applied.has(itemId)) {
        this._scene.removeSprite(sprite);
        this._renderer.releaseSpriteResources(sprite.id);
        this._clothingSprites.delete(itemId);
      }
    }

    // Add sprites for newly applied items
    for (const itemId of applied) {
      if (this._clothingSprites.has(itemId)) continue;

      const itemMeta = ASSET_MANIFEST.clothing[itemId];
      const itemPaths = CLOTHING_PATHS[itemId];
      if (\!itemMeta || \!itemPaths) continue;

      // Load texture
      const textureId = `clothing-${itemId}`;
      if (\!this._textureManager.has(textureId)) {
        await this._textureManager.loadSVG(textureId, {
          paths: itemPaths.paths,
          width: itemPaths.width,
          height: itemPaths.height,
        });
      }

      // Calculate position based on attachment slot
      const slot = dinoData.slots[itemMeta.slot];
      if (\!slot) continue;

      const dinoScale = this._dinoSprite.width / dinoData.width;
      const itemScale = (itemMeta.scale || 1) * dinoScale;
      const offset = itemMeta.offset || { x: 0, y: 0 };

      // Position relative to the dino sprite
      const slotX = this._dinoSprite.x - this._dinoSprite.width * this._dinoSprite.anchorX + slot.x * dinoScale;
      const slotY = this._dinoSprite.y - this._dinoSprite.height * this._dinoSprite.anchorY + slot.y * dinoScale;

      const sprite = new Sprite({
        textureId,
        x: slotX + offset.x * dinoScale,
        y: slotY + offset.y * dinoScale,
        width: itemPaths.width * itemScale,
        height: itemPaths.height * itemScale,
        zIndex: itemMeta.zIndex || 20,
        label: `clothing-${itemId}`,
        anchorX: 0.5,
        anchorY: 0.5,
      });

      // Store base Y for bounce animation sync
      sprite._baseY = sprite.y;

      this._scene.add(sprite);
      this._clothingSprites.set(itemId, sprite);
    }

    this._scene.markDirty();

    // Update UI
    if (this._clothingPanel) {
      this._clothingPanel.setAppliedItems(state.appliedClothing);
    }
    if (this._toolbar) {
      this._toolbar.setAppliedCount(state.appliedClothing.length);
    }
  }

  /**
   * Handle back button — confirm if clothing is applied.
   */
  _handleBack() {
    const state = store.getState();
    if (state.appliedClothing.length > 0) {
      const confirmed = window.confirm(
        "Going back will remove all clothing. Are you sure?"
      );
      if (\!confirmed) return;
    }
    goToSelection();
  }

  /**
   * Clear all sprites from the scene.
   */
  _clearScene() {
    if (this._dinoSprite) {
      this._scene.removeSprite(this._dinoSprite);
      this._dinoSprite = null;
    }
    for (const [, sprite] of this._clothingSprites) {
      this._scene.removeSprite(sprite);
    }
    this._clothingSprites.clear();
    this._scene.markDirty();
  }

  /**
   * Clean up subscriptions and UI components.
   */
  destroy() {
    this._unsubscribers.forEach((unsub) => unsub());
    this._unsubscribers = [];

    if (this._clothingPanel) this._clothingPanel.destroy();
    if (this._toolbar) this._toolbar.destroy();

    this._clearScene();
    this._renderer.onFrame = null;
  }
}
