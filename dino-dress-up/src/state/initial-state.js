/**
 * initial-state.js - Default application state shape
 * Part of the Dino Dress-Up state management system
 *
 * Defines the complete state tree. Every possible state key is declared
 * here so the store, actions, and UI all agree on the shape.
 */

/**
 * @typedef {"select"|"dressing"|"finished"} ScreenId
 */

/**
 * @typedef {"trex"|"triceratops"|"stegosaurus"} DinoId
 */

/**
 * @typedef {Object} DragState
 * @property {boolean} isDragging
 * @property {string|null} itemId
 * @property {{x: number, y: number}} cursorPos
 */

/**
 * Create a fresh copy of the initial state.
 * Returns a new object every time to prevent shared references.
 *
 * @returns {Object} The initial application state
 */
export function createInitialState() {
  return {
    /** @type {ScreenId} Current active screen */
    currentScreen: "select",

    /** @type {DinoId|null} Selected dinosaur ID */
    selectedDino: null,

    /** @type {string[]} Array of applied clothing item IDs */
    appliedClothing: [],

    /** @type {string} Currently active clothing category in the sidebar */
    activeCategory: "hats",

    /** @type {DragState} Current drag-and-drop state */
    dragState: {
      isDragging: false,
      itemId: null,
      cursorPos: { x: 0, y: 0 },
    },

    /** @type {Array<Object>} Active animations for the render loop */
    animations: [],

    /** @type {boolean} Whether assets are currently loading */
    isLoading: true,

    /** @type {number} Loading progress (0-1) */
    loadingProgress: 0,

    /** @type {string} Loading status message */
    loadingMessage: "Initializing...",

    /** @type {"webgpu"|"canvas2d"|null} Current rendering mode */
    renderMode: null,
  };
}
