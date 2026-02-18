/**
 * initial-state.js - Default application state shape
 * Part of the Dino Dress-Up state management system
 *
 * Defines the canonical state shape for the entire application.
 * The store is initialized with a deep clone of this object.
 */

/**
 * @typedef {Object} AppState
 * @property {"select"|"dressing"|"finished"} currentScreen
 * @property {null|"trex"|"triceratops"|"stegosaurus"} selectedDino
 * @property {string[]} appliedClothing - Array of clothing item IDs
 * @property {string} activeCategory - Currently selected clothing category
 * @property {Object} dragState - Current drag-and-drop state
 * @property {boolean} dragState.isDragging
 * @property {string|null} dragState.itemId
 * @property {{x: number, y: number}} dragState.cursorPos
 * @property {Object[]} animations - Active animation descriptors
 * @property {boolean} isLoading - Whether assets are being loaded
 * @property {string} loadingMessage - Current loading status text
 */

export const INITIAL_STATE = Object.freeze({
  // Screen routing
  currentScreen: "select",

  // Selected dinosaur (null until chosen)
  selectedDino: null,

  // Currently applied clothing item IDs
  appliedClothing: [],

  // Active category in the clothing panel
  activeCategory: "hats",

  // Drag-and-drop state
  dragState: {
    isDragging: false,
    itemId: null,
    cursorPos: { x: 0, y: 0 },
  },

  // Active animations (managed by the render loop)
  animations: [],

  // Loading state
  isLoading: true,
  loadingMessage: "Starting up...",
});

/**
 * Create a fresh deep clone of the initial state.
 * @returns {AppState}
 */
export function createInitialState() {
  return JSON.parse(JSON.stringify(INITIAL_STATE));
}
