/**
 * gpu-context.js - WebGPU device setup and Canvas2D fallback detection
 * Part of the Dino Dress-Up WebGPU rendering engine
 *
 * Initializes the GPU adapter, device, and canvas context.
 * Falls back to Canvas2D if WebGPU is not available.
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DPI_SCALE,
  PHYSICAL_WIDTH,
  PHYSICAL_HEIGHT,
  PREFERRED_CANVAS_FORMAT,
} from "../utils/constants.js";

/**
 * @typedef {Object} GPUContextResult
 * @property {"webgpu"|"canvas2d"} mode - The rendering mode
 * @property {HTMLCanvasElement} canvas - The canvas element
 * @property {GPUDevice} [device] - WebGPU device (only in webgpu mode)
 * @property {GPUCanvasContext} [gpuContext] - WebGPU canvas context
 * @property {GPUTextureFormat} [format] - Preferred texture format
 * @property {CanvasRenderingContext2D} [ctx2d] - 2D context (only in canvas2d mode)
 */

/**
 * Initialize the GPU context. Attempts WebGPU first, falls back to Canvas2D.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element to initialize
 * @returns {Promise<GPUContextResult>}
 */
export async function initGPUContext(canvas) {
  // Set canvas logical and physical dimensions
  canvas.width = PHYSICAL_WIDTH;
  canvas.height = PHYSICAL_HEIGHT;
  canvas.style.width = CANVAS_WIDTH + "px";
  canvas.style.height = CANVAS_HEIGHT + "px";

  // Try WebGPU
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "low-power",
      });

      if (!adapter) {
        console.warn("WebGPU adapter not found, falling back to Canvas2D");
        return initCanvas2DFallback(canvas);
      }

      const device = await adapter.requestDevice({
        label: "Dino Dress-Up Device",
      });

      // Handle device loss
      device.lost.then((info) => {
        console.error("WebGPU device lost:", info.message);
        if (info.reason !== "destroyed") {
          // Could attempt re-initialization here
          console.warn("Attempting to recover...");
        }
      });

      // Configure canvas context
      const gpuContext = canvas.getContext("webgpu");
      const format = navigator.gpu.getPreferredCanvasFormat();

      gpuContext.configure({
        device,
        format,
        alphaMode: "premultiplied",
      });

      console.log("WebGPU initialized successfully");

      return {
        mode: "webgpu",
        canvas,
        device,
        gpuContext,
        format,
      };
    } catch (err) {
      console.warn("WebGPU initialization failed:", err);
      return initCanvas2DFallback(canvas);
    }
  }

  console.warn("WebGPU not supported, falling back to Canvas2D");
  return initCanvas2DFallback(canvas);
}

/**
 * Initialize Canvas2D fallback renderer context.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {GPUContextResult}
 */
function initCanvas2DFallback(canvas) {
  const ctx2d = canvas.getContext("2d");
  ctx2d.scale(DPI_SCALE, DPI_SCALE);

  console.log("Canvas2D fallback initialized");

  return {
    mode: "canvas2d",
    canvas,
    ctx2d,
  };
}

/**
 * Check if WebGPU is available in the current browser.
 * @returns {boolean}
 */
export function isWebGPUAvailable() {
  return typeof navigator !== "undefined" && !!navigator.gpu;
}

