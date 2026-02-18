/**
 * constants.js - Canvas dimensions, z-index ranges, and rendering constants
 * Part of the Dino Dress-Up WebGPU rendering engine
 */

// Canvas dimensions (logical pixels)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 800;

// Device pixel ratio for crisp rendering on HiDPI displays
export const DPI_SCALE = Math.min(window.devicePixelRatio || 1, 2);

// Physical canvas dimensions
export const PHYSICAL_WIDTH = CANVAS_WIDTH * DPI_SCALE;
export const PHYSICAL_HEIGHT = CANVAS_HEIGHT * DPI_SCALE;

// Maximum texture size for SVG rasterization
export const MAX_TEXTURE_SIZE = 512;

// Z-index ranges for layered sprite compositing
export const Z_RANGES = Object.freeze({
  BACKGROUND:     { min: -10, max: -1 },
  BODY:           { min: 0,   max: 10 },
  LOWER_CLOTHING: { min: 11,  max: 20 },
  UPPER_CLOTHING: { min: 21,  max: 30 },
  HEAD:           { min: 31,  max: 40 },
  OVERLAYS:       { min: 41,  max: 50 },
});

// Clothing categories
export const CATEGORIES = Object.freeze([
  "hats",
  "eyewear",
  "neckwear",
  "tops",
  "capes",
  "footwear",
  "accessories",
  "tail-flair",
]);

// Max items per category (accessories allow 2)
export const MAX_ITEMS_PER_CATEGORY = Object.freeze({
  hats: 1,
  eyewear: 1,
  neckwear: 1,
  tops: 1,
  capes: 1,
  footwear: 1,
  accessories: 2,
  "tail-flair": 1,
});

// WebGPU texture format
export const TEXTURE_FORMAT = "rgba8unorm";
export const PREFERRED_CANVAS_FORMAT = "bgra8unorm";

// Animation constants
export const IDLE_BOUNCE_AMPLITUDE = 4;   // pixels
export const IDLE_BOUNCE_SPEED = 0.002;   // radians per ms
export const CONFETTI_PARTICLE_COUNT = 60;

// Render loop
export const TARGET_FPS = 60;
export const FRAME_BUDGET_MS = 1000 / TARGET_FPS;
