/**
 * svg-rasterizer.js - OffscreenCanvas SVG rasterization
 * Part of the Dino Dress-Up WebGPU rendering engine
 *
 * Converts SVG path data into rasterized ImageBitmap/ImageData
 * using OffscreenCanvas for off-thread rendering.
 */

import { MAX_TEXTURE_SIZE, DPI_SCALE } from "./constants.js";

/**
 * Rasterize SVG path data to an ImageBitmap suitable for GPU texture upload.
 *
 * @param {Object} options
 * @param {Array<Object>} options.paths - Array of {d, fill, stroke, strokeWidth, opacity} path objects
 * @param {number} options.width - Logical width of the SVG
 * @param {number} options.height - Logical height of the SVG
 * @param {number} [options.scale=DPI_SCALE] - Rasterization scale (2x for HiDPI)
 * @param {number[]} [options.backgroundColor=null] - Optional [r, g, b, a] background fill
 * @returns {Promise<ImageBitmap>}
 */
export async function rasterizeSVGPaths({
  paths,
  width,
  height,
  scale = DPI_SCALE,
  backgroundColor = null,
}) {
  // Cap final texture size
  const maxDim = Math.max(width, height) * scale;
  if (maxDim > MAX_TEXTURE_SIZE) {
    scale = MAX_TEXTURE_SIZE / Math.max(width, height);
  }

  const physW = Math.ceil(width * scale);
  const physH = Math.ceil(height * scale);

  // Use OffscreenCanvas if available, fallback to regular canvas
  const canvas = typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(physW, physH)
    : createFallbackCanvas(physW, physH);

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // Optional background
  if (backgroundColor) {
    const [r, g, b, a] = backgroundColor;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    ctx.fillRect(0, 0, width, height);
  }

  // Draw each path
  for (const pathData of paths) {
    ctx.save();

    if (pathData.transform) {
      applyTransform(ctx, pathData.transform);
    }

    const path = new Path2D(pathData.d);

    if (pathData.opacity !== undefined && pathData.opacity < 1) {
      ctx.globalAlpha = pathData.opacity;
    }

    if (pathData.fill && pathData.fill !== "none") {
      ctx.fillStyle = pathData.fill;
      ctx.fill(path);
    }

    if (pathData.stroke && pathData.stroke !== "none") {
      ctx.strokeStyle = pathData.stroke;
      ctx.lineWidth = pathData.strokeWidth || 1;
      ctx.lineCap = pathData.lineCap || "round";
      ctx.lineJoin = pathData.lineJoin || "round";
      ctx.stroke(path);
    }

    ctx.restore();
  }

  // Convert to ImageBitmap for efficient GPU upload
  if (typeof createImageBitmap !== "undefined") {
    return createImageBitmap(canvas);
  }

  // Fallback: return the canvas itself (texture-manager handles both)
  return canvas;
}

/**
 * Rasterize a complete SVG string (for more complex SVGs).
 *
 * @param {string} svgString - Complete SVG markup
 * @param {number} width - Target width
 * @param {number} height - Target height
 * @returns {Promise<ImageBitmap>}
 */
export async function rasterizeSVGString(svgString, width, height) {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.width = width;
    img.height = height;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    return createImageBitmap(img, {
      resizeWidth: width * DPI_SCALE,
      resizeHeight: height * DPI_SCALE,
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Apply a transform string to the canvas context.
 * Supports: translate(x, y), scale(x, y), rotate(deg)
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} transform
 */
function applyTransform(ctx, transform) {
  const translateMatch = transform.match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
  if (translateMatch) {
    ctx.translate(parseFloat(translateMatch[1]), parseFloat(translateMatch[2]));
  }

  const scaleMatch = transform.match(/scale\(\s*([-\d.]+)(?:[,\s]+([-\d.]+))?\s*\)/);
  if (scaleMatch) {
    const sx = parseFloat(scaleMatch[1]);
    const sy = scaleMatch[2] !== undefined ? parseFloat(scaleMatch[2]) : sx;
    ctx.scale(sx, sy);
  }

  const rotateMatch = transform.match(/rotate\(\s*([-\d.]+)\s*\)/);
  if (rotateMatch) {
    ctx.rotate((parseFloat(rotateMatch[1]) * Math.PI) / 180);
  }
}

/**
 * Create a fallback regular canvas element (for environments without OffscreenCanvas).
 */
function createFallbackCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
