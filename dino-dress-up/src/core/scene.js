/**
 * scene.js - Scene manager for ordered sprite collections
 * Part of the Dino Dress-Up WebGPU rendering engine
 *
 * Manages a collection of sprites, sorted by z-index for
 * correct back-to-front alpha-blended rendering.
 */

export class Scene {
  constructor() {
    /** @type {Map<number, import("./sprite.js").Sprite>} */
    this._sprites = new Map();

    /** @type {import("./sprite.js").Sprite[]} */
    this._sortedSprites = [];

    /** @type {boolean} */
    this._sortDirty = true;

    /** @type {boolean} - Global dirty flag for render loop optimization */
    this.dirty = true;
  }

  /**
   * Add a sprite to the scene.
   * @param {import("./sprite.js").Sprite} sprite
   * @returns {import("./sprite.js").Sprite} The added sprite (for chaining)
   */
  add(sprite) {
    this._sprites.set(sprite.id, sprite);
    this._sortDirty = true;
    this.dirty = true;
    return sprite;
  }

  /**
   * Remove a sprite from the scene by ID.
   * @param {number} spriteId
   * @returns {boolean} Whether the sprite was found and removed
   */
  remove(spriteId) {
    const removed = this._sprites.delete(spriteId);
    if (removed) {
      this._sortDirty = true;
      this.dirty = true;
    }
    return removed;
  }

  /**
   * Remove a sprite instance from the scene.
   * @param {import("./sprite.js").Sprite} sprite
   * @returns {boolean}
   */
  removeSprite(sprite) {
    return this.remove(sprite.id);
  }

  /**
   * Get a sprite by ID.
   * @param {number} spriteId
   * @returns {import("./sprite.js").Sprite|undefined}
   */
  get(spriteId) {
    return this._sprites.get(spriteId);
  }

  /**
   * Check if a sprite exists in the scene.
   * @param {number} spriteId
   * @returns {boolean}
   */
  has(spriteId) {
    return this._sprites.has(spriteId);
  }

  /**
   * Get all visible sprites sorted by z-index (back-to-front).
   * Uses cached sort when z-order hasn't changed.
   * @returns {import("./sprite.js").Sprite[]}
   */
  getSortedSprites() {
    if (this._sortDirty) {
      this._sortedSprites = Array.from(this._sprites.values())
        .sort((a, b) => a.zIndex - b.zIndex);
      this._sortDirty = false;
    }
    return this._sortedSprites.filter((s) => s.visible);
  }

  /**
   * Notify the scene that a sprite's z-index has changed.
   */
  markSortDirty() {
    this._sortDirty = true;
    this.dirty = true;
  }

  /**
   * Mark the scene as needing a re-render.
   */
  markDirty() {
    this.dirty = true;
  }

  /**
   * Clear the dirty flag after a render.
   */
  clearDirty() {
    this.dirty = false;
  }

  /**
   * Remove all sprites from the scene.
   */
  clear() {
    this._sprites.clear();
    this._sortedSprites = [];
    this._sortDirty = false;
    this.dirty = true;
  }

  /**
   * Get the number of sprites in the scene.
   * @returns {number}
   */
  get size() {
    return this._sprites.size;
  }

  /**
   * Iterate over all sprites (unsorted).
   * @param {function(import("./sprite.js").Sprite): void} callback
   */
  forEach(callback) {
    this._sprites.forEach(callback);
  }

  /**
   * Find sprites by a predicate function.
   * @param {function(import("./sprite.js").Sprite): boolean} predicate
   * @returns {import("./sprite.js").Sprite[]}
   */
  findAll(predicate) {
    const results = [];
    this._sprites.forEach((sprite) => {
      if (predicate(sprite)) results.push(sprite);
    });
    return results;
  }

  /**
   * Find a single sprite by label.
   * @param {string} label
   * @returns {import("./sprite.js").Sprite|undefined}
   */
  findByLabel(label) {
    for (const sprite of this._sprites.values()) {
      if (sprite.label === label) return sprite;
    }
    return undefined;
  }
}
