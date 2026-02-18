/**
 * actions.js - Action dispatchers and clothing conflict logic
 * Part of the Dino Dress-Up state management system
 *
 * Each action function reads the current state, computes the next state,
 * and calls store.set() with the updates. Subscribers are notified
 * automatically.
 *
 * Clothing conflict rules:
 * - One item per category (except accessories allows 2)
 * - Skateboard conflicts with all footwear (mutually exclusive)
 */

import { store } from "./store.js";
import { ASSET_MANIFEST } from "../assets/asset-manifest.js";
import { MAX_ITEMS_PER_CATEGORY } from "../utils/constants.js";

// ─── Screen Navigation ──────────────────────────────────────────────────────

/**
 * Select a dinosaur and transition to the dressing screen.
 * @param {"trex"|"triceratops"|"stegosaurus"} dinoId
 */
export function selectDino(dinoId) {
  store.batch(() => {
    store.set({
      selectedDino: dinoId,
      currentScreen: "dressing",
      appliedClothing: [],
      activeCategory: "hats",
    });
  });
}

/**
 * Navigate to the finished screen.
 */
export function finishDressing() {
  store.set({ currentScreen: "finished" });
}

/**
 * Go back to the dressing screen from the finished screen.
 */
export function dressAgain() {
  store.set({ currentScreen: "dressing" });
}

/**
 * Go back to the selection screen. Clears all clothing.
 */
export function goToSelection() {
  store.batch(() => {
    store.set({
      currentScreen: "select",
      selectedDino: null,
      appliedClothing: [],
      activeCategory: "hats",
    });
  });
}

/**
 * Reset the entire game state.
 */
export function resetGame() {
  store.reset();
}

// ─── Clothing Management ────────────────────────────────────────────────────

/**
 * Get the clothing item metadata from the asset manifest.
 * @param {string} itemId
 * @returns {Object|null}
 */
function getItemMeta(itemId) {
  return ASSET_MANIFEST.clothing[itemId] || null;
}

/**
 * Apply a clothing item (or remove it if already applied — toggle behavior).
 *
 * Enforces conflict rules:
 * - Max items per category (1 for most, 2 for accessories)
 * - Skateboard conflicts with all footwear
 *
 * @param {string} itemId - The clothing item ID to toggle
 * @returns {{ applied: boolean, removed: string[] }} Result of the action
 */
export function toggleClothing(itemId) {
  const state = store.getState();
  const currentItems = [...state.appliedClothing];
  const meta = getItemMeta(itemId);

  if (\!meta) {
    console.warn(`Unknown clothing item: ${itemId}`);
    return { applied: false, removed: [] };
  }

  // If already applied, remove it
  const existingIndex = currentItems.indexOf(itemId);
  if (existingIndex \!== -1) {
    currentItems.splice(existingIndex, 1);
    store.set({ appliedClothing: currentItems });
    return { applied: false, removed: [itemId] };
  }

  // Applying a new item — check conflicts
  const removed = [];
  const category = meta.category;
  const maxItems = MAX_ITEMS_PER_CATEGORY[category] || 1;

  // Find existing items in the same category
  const sameCategory = currentItems.filter((id) => {
    const m = getItemMeta(id);
    return m && m.category === category;
  });

  // Remove excess items in the same category (FIFO)
  while (sameCategory.length >= maxItems) {
    const oldest = sameCategory.shift();
    const idx = currentItems.indexOf(oldest);
    if (idx \!== -1) {
      currentItems.splice(idx, 1);
      removed.push(oldest);
    }
  }

  // Skateboard ↔ footwear conflict
  if (itemId === "skateboard") {
    // Remove all footwear
    const footwear = currentItems.filter((id) => {
      const m = getItemMeta(id);
      return m && m.category === "footwear";
    });
    for (const fwId of footwear) {
      const idx = currentItems.indexOf(fwId);
      if (idx \!== -1) {
        currentItems.splice(idx, 1);
        removed.push(fwId);
      }
    }
  } else if (category === "footwear") {
    // Remove skateboard if applying footwear
    const skateIdx = currentItems.indexOf("skateboard");
    if (skateIdx \!== -1) {
      currentItems.splice(skateIdx, 1);
      removed.push("skateboard");
    }
  }

  // Apply the new item
  currentItems.push(itemId);
  store.set({ appliedClothing: currentItems });

  return { applied: true, removed };
}

/**
 * Remove a specific clothing item.
 * @param {string} itemId
 */
export function removeClothing(itemId) {
  const current = store.getState().appliedClothing;
  const idx = current.indexOf(itemId);
  if (idx === -1) return;

  const next = [...current];
  next.splice(idx, 1);
  store.set({ appliedClothing: next });
}

/**
 * Clear all applied clothing.
 */
export function clearAllClothing() {
  store.set({ appliedClothing: [] });
}

/**
 * Apply a random outfit (one item per category, sometimes skipping).
 */
export function randomizeOutfit() {
  const manifest = ASSET_MANIFEST.clothing;
  const categories = ASSET_MANIFEST.categories;
  const newItems = [];

  for (const cat of categories) {
    // 70% chance to pick an item per category (for variety)
    if (Math.random() > 0.7) continue;

    const categoryItems = Object.entries(manifest)
      .filter(([, meta]) => meta.category === cat.id)
      .map(([id]) => id);

    if (categoryItems.length === 0) continue;

    const randomItem =
      categoryItems[Math.floor(Math.random() * categoryItems.length)];
    newItems.push(randomItem);
  }

  // Enforce skateboard/footwear conflict
  const hasSkateboard = newItems.includes("skateboard");
  const hasFootwear = newItems.some((id) => {
    const m = getItemMeta(id);
    return m && m.category === "footwear";
  });
  if (hasSkateboard && hasFootwear) {
    // Remove footwear (keep skateboard since it is more fun)
    const filtered = newItems.filter((id) => {
      const m = getItemMeta(id);
      return \!(m && m.category === "footwear");
    });
    store.set({ appliedClothing: filtered });
  } else {
    store.set({ appliedClothing: newItems });
  }
}

// ─── Category Navigation ────────────────────────────────────────────────────

/**
 * Set the active clothing category in the panel.
 * @param {string} categoryId
 */
export function setActiveCategory(categoryId) {
  store.set({ activeCategory: categoryId });
}

// ─── Drag State ─────────────────────────────────────────────────────────────

/**
 * Begin dragging a clothing item.
 * @param {string} itemId
 * @param {number} x
 * @param {number} y
 */
export function startDrag(itemId, x, y) {
  store.set({
    dragState: { isDragging: true, itemId, cursorPos: { x, y } },
  });
}

/**
 * Update the drag cursor position.
 * @param {number} x
 * @param {number} y
 */
export function updateDrag(x, y) {
  const current = store.getState().dragState;
  if (\!current.isDragging) return;
  store.set({
    dragState: { ...current, cursorPos: { x, y } },
  });
}

/**
 * End the drag operation.
 */
export function endDrag() {
  store.set({
    dragState: { isDragging: false, itemId: null, cursorPos: { x: 0, y: 0 } },
  });
}

// ─── Loading State ──────────────────────────────────────────────────────────

/**
 * Update loading progress.
 * @param {string} message
 */
export function setLoadingMessage(message) {
  store.set({ loadingMessage: message });
}

/**
 * Mark loading as complete.
 */
export function finishLoading() {
  store.set({ isLoading: false });
}
