/**
 * dressing-screen.js - Dressing room screen controller
 *
 * The main game view. Bridges state changes to:
 * - Scene sprite updates (add/remove clothing sprites)
 * - Canvas rendering with idle bounce animation
 *
 * Toolbar and ClothingPanel wiring is handled by main.js, which
 * creates those UI components with the appropriate callbacks.
 * This controller focuses on the canvas/scene side of things.
 */

import { store } from '../state/store.js';
import { ASSET_MANIFEST } from '../assets/asset-manifest.js';
import { DINO_PATHS } from '../assets/dino-paths.js';
import { CLOTHING_PATHS } from '../assets/clothing-paths.js';
import { Sprite } from '../core/sprite.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, IDLE_BOUNCE_AMPLITUDE, IDLE_BOUNCE_SPEED } from '../utils/constants.js';

export class DressingScreen {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {import('../core/scene.js').Scene} options.scene
   * @param {import('../core/texture-manager.js').TextureManager} options.textureManager
   * @param {import('../core/renderer.js').Renderer} options.renderer
   */
  constructor({ container, scene, textureManager, renderer }) {
    this._container = container;
    this._scene = scene;
    this._textureManager = textureManager;
    this._renderer = renderer;

    this._dinoSprite = null;
    this._clothingSprites = new Map();
    this._unsubscribers = [];
    this._currentDinoId = null;
    this._dinoBaseY = CANVAS_HEIGHT / 2 + 20;
  }

  /** Initialize subscriptions. */
  init() {
    this._unsubscribers.push(
      store.subscribe('selectedDino', (state) => {
        this._loadDino(state.selectedDino);
      })
    );

    this._unsubscribers.push(
      store.subscribe('appliedClothing', (state) => {
        this._syncClothingSprites(state.appliedClothing);
      })
    );
  }

  /**
   * Load a dinosaur into the scene.
   * @param {string|null} dinoId
   */
  async _loadDino(dinoId) {
    if (!dinoId || dinoId === this._currentDinoId) return;

    // Remove old dino sprite
    if (this._dinoSprite) {
      this._scene.removeSprite(this._dinoSprite);
      this._renderer.releaseSpriteResources(this._dinoSprite.id);
      this._dinoSprite = null;
    }

    this._clearAllClothingSprites();

    const dinoData = DINO_PATHS[dinoId];
    if (!dinoData) return;

    // Load dino texture (may already be cached from preload)
    const textureId = 'dino-' + dinoId;
    await this._textureManager.loadSVG(textureId, {
      paths: dinoData.paths,
      width: dinoData.width,
      height: dinoData.height,
    });

    // Scale dino to fit canvas nicely
    const scale = Math.min(
      (CANVAS_WIDTH * 0.7) / dinoData.width,
      (CANVAS_HEIGHT * 0.7) / dinoData.height
    );

    this._dinoSprite = new Sprite({
      textureId,
      x: CANVAS_WIDTH / 2,
      y: this._dinoBaseY,
      width: dinoData.width * scale,
      height: dinoData.height * scale,
      zIndex: 5,
      label: 'dino-' + dinoId,
      anchorX: 0.5,
      anchorY: 0.5,
    });

    this._scene.add(this._dinoSprite);
    this._currentDinoId = dinoId;

    // Set up idle bounce animation
    this._renderer.onFrame = (timestamp) => {
      if (this._dinoSprite) {
        const bounce = Math.sin(timestamp * IDLE_BOUNCE_SPEED) * IDLE_BOUNCE_AMPLITUDE;
        const newY = this._dinoBaseY + bounce;
        this._dinoSprite.setPosition(this._dinoSprite.x, newY);

        // Also bounce clothing sprites in sync
        for (const [itemId, sprite] of this._clothingSprites) {
          sprite.setPosition(sprite.x, sprite._baseY + bounce);
          // Bounce slot2 sprite too
          if (sprite._slot2Sprite) {
            sprite._slot2Sprite.setPosition(
              sprite._slot2Sprite.x,
              sprite._slot2Sprite._baseY + bounce
            );
          }
        }

        this._scene.markDirty();
      }
    };

    this._scene.markDirty();
  }

  /**
   * Sync clothing sprites with applied clothing state.
   * @param {string[]} appliedClothing
   */
  async _syncClothingSprites(appliedClothing) {
    const appliedSet = new Set(appliedClothing);

    // Remove sprites that are no longer applied
    for (const [itemId, sprite] of this._clothingSprites) {
      if (!appliedSet.has(itemId)) {
        this._scene.removeSprite(sprite);
        this._renderer.releaseSpriteResources(sprite.id);
        // Also remove slot2 sprite if present
        if (sprite._slot2Sprite) {
          this._scene.removeSprite(sprite._slot2Sprite);
          this._renderer.releaseSpriteResources(sprite._slot2Sprite.id);
        }
        this._clothingSprites.delete(itemId);
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
   * Create and add a clothing sprite to the scene.
   * @param {string} itemId
   */
  async _addClothingSprite(itemId) {
    const meta = ASSET_MANIFEST.clothing[itemId];
    const pathData = CLOTHING_PATHS[itemId];
    if (!meta || !pathData || !this._dinoSprite || !this._currentDinoId) return;

    const dinoData = DINO_PATHS[this._currentDinoId];
    if (!dinoData) return;

    // Load clothing texture (may already be cached from preload)
    const textureId = 'clothing-' + itemId;
    await this._textureManager.loadSVG(textureId, {
      paths: pathData.paths,
      width: pathData.width,
      height: pathData.height,
    });

    // Calculate position based on attachment slot + offset
    const slot = dinoData.slots[meta.slot];
    if (!slot) {
      console.warn('DressingScreen: No slot "' + meta.slot + '" on dino "' + this._currentDinoId + '" for item "' + itemId + '"');
      return;
    }

    const dinoScale = this._dinoSprite.width / dinoData.width;
    const itemScale = (meta.scale || 1) * dinoScale;

    const dinoLeft = this._dinoSprite.x - this._dinoSprite.width * this._dinoSprite.anchorX;
    const dinoTop = this._dinoSprite.y - this._dinoSprite.height * this._dinoSprite.anchorY;

    const offsetX = meta.offset ? meta.offset.x : 0;
    const offsetY = meta.offset ? meta.offset.y : 0;

    const itemX = dinoLeft + slot.x * dinoScale + offsetX * dinoScale;
    const itemY = dinoTop + slot.y * dinoScale + offsetY * dinoScale;

    const sprite = new Sprite({
      textureId,
      x: itemX + (pathData.width * itemScale) / 2,
      y: itemY + (pathData.height * itemScale) / 2,
      width: pathData.width * itemScale,
      height: pathData.height * itemScale,
      zIndex: meta.zIndex || 20,
      label: 'clothing-' + itemId,
      anchorX: 0.5,
      anchorY: 0.5,
    });

    // Store base Y for bounce animation sync
    sprite._baseY = sprite.y;

    this._scene.add(sprite);
    this._clothingSprites.set(itemId, sprite);

    // If item has a slot2 (e.g. footwear: leftFoot + rightFoot), add mirrored sprite
    if (meta.slot2) {
      const slot2 = dinoData.slots[meta.slot2];
      if (slot2) {
        const item2X = dinoLeft + slot2.x * dinoScale + offsetX * dinoScale;
        const item2Y = dinoTop + slot2.y * dinoScale + offsetY * dinoScale;

        const sprite2 = new Sprite({
          textureId,
          x: item2X + (pathData.width * itemScale) / 2,
          y: item2Y + (pathData.height * itemScale) / 2,
          width: pathData.width * itemScale,
          height: pathData.height * itemScale,
          zIndex: meta.zIndex || 20,
          label: 'clothing-' + itemId + '-slot2',
          anchorX: 0.5,
          anchorY: 0.5,
        });

        sprite2._baseY = sprite2.y;
        this._scene.add(sprite2);
        // Store slot2 sprite reference on primary sprite for cleanup
        sprite._slot2Sprite = sprite2;
      }
    }
  }

  _clearAllClothingSprites() {
    for (const [itemId, sprite] of this._clothingSprites) {
      this._scene.removeSprite(sprite);
      this._renderer.releaseSpriteResources(sprite.id);
      // Also clean up slot2 sprites
      if (sprite._slot2Sprite) {
        this._scene.removeSprite(sprite._slot2Sprite);
        this._renderer.releaseSpriteResources(sprite._slot2Sprite.id);
      }
    }
    this._clothingSprites.clear();
  }

  onEnter() {
    this._renderer.start();
    this._scene.markDirty();
  }

  onExit() {
    // Keep renderer running for finished screen canvas reuse
  }

  destroy() {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    this._clearAllClothingSprites();
    if (this._dinoSprite) {
      this._scene.removeSprite(this._dinoSprite);
      this._dinoSprite = null;
    }
    this._renderer.onFrame = null;
  }
}


