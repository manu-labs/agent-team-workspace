/**
 * sprite.js - Sprite data class for 2D rendering
 * Part of the Dino Dress-Up WebGPU rendering engine
 *
 * A Sprite represents a single textured quad in the scene with
 * position, scale, rotation, z-index, opacity, and tint properties.
 */

import { Mat4 } from "../utils/math.js";

let spriteIdCounter = 0;

export class Sprite {
  /**
   * @param {Object} options
   * @param {string} options.textureId - ID used to look up the GPUTexture
   * @param {number} [options.x=0] - X position (logical pixels)
   * @param {number} [options.y=0] - Y position (logical pixels)
   * @param {number} [options.width=64] - Display width (logical pixels)
   * @param {number} [options.height=64] - Display height (logical pixels)
   * @param {number} [options.rotation=0] - Rotation in radians
   * @param {number} [options.zIndex=0] - Z-index for draw ordering
   * @param {number} [options.opacity=1] - Opacity (0 = transparent, 1 = opaque)
   * @param {number[]} [options.tint=[1,1,1,0]] - Tint [r, g, b, strength]
   * @param {boolean} [options.visible=true] - Whether to render this sprite
   * @param {string} [options.label=""] - Human-readable label for debugging
   * @param {number} [options.anchorX=0.5] - Anchor point X (0=left, 0.5=center, 1=right)
   * @param {number} [options.anchorY=0.5] - Anchor point Y (0=top, 0.5=center, 1=bottom)
   */
  constructor({
    textureId,
    x = 0,
    y = 0,
    width = 64,
    height = 64,
    rotation = 0,
    zIndex = 0,
    opacity = 1,
    tint = [1, 1, 1, 0],
    visible = true,
    label = "",
    anchorX = 0.5,
    anchorY = 0.5,
  } = {}) {
    this.id = ++spriteIdCounter;
    this.textureId = textureId;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.rotation = rotation;
    this.zIndex = zIndex;
    this.opacity = opacity;
    this.tint = Float32Array.from(tint);
    this.visible = visible;
    this.label = label;
    this.anchorX = anchorX;
    this.anchorY = anchorY;

    // Dirty flag for model matrix caching
    this._dirty = true;
    this._modelMatrix = Mat4.identity();
  }

  /**
   * Get the model matrix for this sprite.
   * Cached and only recomputed when dirty.
   * @returns {Float32Array} 4x4 model matrix (column-major)
   */
  getModelMatrix() {
    if (this._dirty) {
      // Compute anchor offset so the sprite pivots around the anchor point
      const offsetX = -this.anchorX * this.width;
      const offsetY = -this.anchorY * this.height;

      // Build: Translate(x,y) * Rotate(rotation) * Translate(offset) * Scale(w,h)
      // For the unit quad [0,1], this places the sprite correctly
      if (this.rotation === 0) {
        // Optimized path: no rotation
        this._modelMatrix = Mat4.model(
          this.x + offsetX,
          this.y + offsetY,
          this.width,
          this.height,
          0
        );
      } else {
        // With rotation around anchor point:
        // T(pos) * R(rot) * T(anchorOffset) * S(size)
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const m = this._modelMatrix;

        m[0]  = cos * this.width;
        m[1]  = sin * this.width;
        m[2]  = 0;
        m[3]  = 0;
        m[4]  = -sin * this.height;
        m[5]  = cos * this.height;
        m[6]  = 0;
        m[7]  = 0;
        m[8]  = 0;
        m[9]  = 0;
        m[10] = 1;
        m[11] = 0;
        m[12] = this.x + cos * offsetX - sin * offsetY;
        m[13] = this.y + sin * offsetX + cos * offsetY;
        m[14] = 0;
        m[15] = 1;
      }

      this._dirty = false;
    }
    return this._modelMatrix;
  }

  /**
   * Mark the sprite transform as dirty (needs matrix recomputation).
   */
  markDirty() {
    this._dirty = true;
  }

  /**
   * Set position and mark dirty.
   * @param {number} x
   * @param {number} y
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this._dirty = true;
  }

  /**
   * Set size and mark dirty.
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this.width = width;
    this.height = height;
    this._dirty = true;
  }

  /**
   * Set rotation (radians) and mark dirty.
   * @param {number} radians
   */
  setRotation(radians) {
    this.rotation = radians;
    this._dirty = true;
  }

  /**
   * Set tint color and strength.
   * @param {number} r - Red (0-1)
   * @param {number} g - Green (0-1)
   * @param {number} b - Blue (0-1)
   * @param {number} [strength=1] - Tint strength (0 = no tint, 1 = full tint)
   */
  setTint(r, g, b, strength = 1) {
    this.tint[0] = r;
    this.tint[1] = g;
    this.tint[2] = b;
    this.tint[3] = strength;
  }

  /**
   * Clone this sprite with a new unique ID.
   * @returns {Sprite}
   */
  clone() {
    return new Sprite({
      textureId: this.textureId,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      zIndex: this.zIndex,
      opacity: this.opacity,
      tint: Array.from(this.tint),
      visible: this.visible,
      label: this.label,
      anchorX: this.anchorX,
      anchorY: this.anchorY,
    });
  }
}
