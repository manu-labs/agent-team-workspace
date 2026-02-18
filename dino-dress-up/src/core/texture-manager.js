/**
 * texture-manager.js - SVG-to-GPUTexture pipeline with caching
 * Part of the Dino Dress-Up WebGPU rendering engine
 *
 * Manages the lifecycle of GPU textures created from rasterized SVG data.
 * Handles caching, lazy loading, and Canvas2D fallback.
 */

import { rasterizeSVGPaths } from "../utils/svg-rasterizer.js";
import { TEXTURE_FORMAT, DPI_SCALE } from "../utils/constants.js";

export class TextureManager {
  /**
   * @param {GPUDevice|null} device - WebGPU device (null for Canvas2D mode)
   */
  constructor(device) {
    this.device = device;

    /** @type {Map<string, GPUTexture>} - Cached GPU textures by ID */
    this._textures = new Map();

    /** @type {Map<string, GPUSampler>} */
    this._samplers = new Map();

    /** @type {Map<string, ImageBitmap|HTMLCanvasElement>} - Canvas2D fallback cache */
    this._bitmapCache = new Map();

    /** @type {Map<string, Promise>} - In-flight texture creation promises */
    this._pending = new Map();

    // Create default sampler
    if (device) {
      this._defaultSampler = device.createSampler({
        label: "Default Sprite Sampler",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
    }
  }

  /**
   * Get the default texture sampler.
   * @returns {GPUSampler}
   */
  get defaultSampler() {
    return this._defaultSampler;
  }

  /**
   * Load SVG path data as a GPU texture (or bitmap for Canvas2D).
   * Caches the result so repeated calls with the same ID are free.
   *
   * @param {string} id - Unique texture identifier
   * @param {Object} svgData - SVG path data for rasterization
   * @param {Array<Object>} svgData.paths - Array of path objects
   * @param {number} svgData.width - Logical SVG width
   * @param {number} svgData.height - Logical SVG height
   * @returns {Promise<GPUTexture|ImageBitmap>}
   */
  async loadSVG(id, svgData) {
    // Return cached texture if available
    if (this.device && this._textures.has(id)) {
      return this._textures.get(id);
    }
    if (!this.device && this._bitmapCache.has(id)) {
      return this._bitmapCache.get(id);
    }

    // Deduplicate in-flight requests
    if (this._pending.has(id)) {
      return this._pending.get(id);
    }

    const promise = this._createTexture(id, svgData);
    this._pending.set(id, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this._pending.delete(id);
    }
  }

  /**
   * Internal: rasterize SVG and upload to GPU.
   */
  async _createTexture(id, svgData) {
    const bitmap = await rasterizeSVGPaths({
      paths: svgData.paths,
      width: svgData.width,
      height: svgData.height,
      scale: DPI_SCALE,
    });

    if (!this.device) {
      // Canvas2D fallback: just cache the bitmap
      this._bitmapCache.set(id, bitmap);
      return bitmap;
    }

    // Create GPU texture from the rasterized bitmap
    const texture = this.device.createTexture({
      label: `Texture: ${id}`,
      size: [bitmap.width, bitmap.height],
      format: TEXTURE_FORMAT,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Upload bitmap data to the texture
    this.device.queue.copyExternalImageToTexture(
      { source: bitmap },
      { texture, premultipliedAlpha: true },
      [bitmap.width, bitmap.height]
    );

    this._textures.set(id, texture);

    // Also cache the bitmap for potential Canvas2D fallback use
    this._bitmapCache.set(id, bitmap);

    return texture;
  }

  /**
   * Get a cached texture by ID (synchronous, returns null if not loaded).
   * @param {string} id
   * @returns {GPUTexture|null}
   */
  getTexture(id) {
    return this._textures.get(id) || null;
  }

  /**
   * Get a cached bitmap by ID (for Canvas2D fallback).
   * @param {string} id
   * @returns {ImageBitmap|HTMLCanvasElement|null}
   */
  getBitmap(id) {
    return this._bitmapCache.get(id) || null;
  }

  /**
   * Check if a texture is loaded.
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this._textures.has(id) || this._bitmapCache.has(id);
  }

  /**
   * Preload multiple SVG assets in parallel.
   *
   * @param {Array<{id: string, svgData: Object}>} assets
   * @returns {Promise<void>}
   */
  async preloadAll(assets) {
    const promises = assets.map(({ id, svgData }) => this.loadSVG(id, svgData));
    await Promise.all(promises);
  }

  /**
   * Release a specific texture from the cache.
   * @param {string} id
   */
  release(id) {
    const texture = this._textures.get(id);
    if (texture) {
      texture.destroy();
      this._textures.delete(id);
    }
    const bitmap = this._bitmapCache.get(id);
    if (bitmap && bitmap.close) {
      bitmap.close();
    }
    this._bitmapCache.delete(id);
  }

  /**
   * Release all cached textures and bitmaps.
   */
  releaseAll() {
    this._textures.forEach((texture) => texture.destroy());
    this._textures.clear();

    this._bitmapCache.forEach((bitmap) => {
      if (bitmap.close) bitmap.close();
    });
    this._bitmapCache.clear();

    this._pending.clear();
  }

  /**
   * Get the number of cached textures.
   * @returns {number}
   */
  get size() {
    return this._textures.size + this._bitmapCache.size;
  }
}

