/**
 * actions.js - Action dispatchers and game logic
 * Part of the Dino Dress-Up state management system
 *
 * All state mutations flow through these action functions.
 * Each action encapsulates the business logic (conflict rules,
 * validation, etc.) and calls store.setState() with the result.
 *
 * Clothing rules:
 * - One item per category (except accessories allows 2)
 * - Skateboard conflicts with all footwear (mutually exclusive)
 */

import { store } from "./store.js";
import { ASSET_MANIFEST } from "../assets/asset-manifest.js";
import { MAX_ITEMS_PER_CATEGORY } from "../utils/constants.js";

// -- Helper: get clothing item metadata --

function getItemMeta(itemId) {
  return ASSET_MANIFEST.clothing[itemId] || null;
}

function getItemsInCategory(appliedClothing, category) {
  return appliedClothing.filter((id) => {
    const meta = getItemMeta(id);
    return meta && meta.category === category;
  });
}

// -- Actions --

/**
 * Select a dinosaur and transition to the dressing screen.
 * @param {string} dinoId - "trex", "triceratops", or "stegosaurus"
 */
export function selectDino(dinoId) {
  const validDinos = ["trex", "triceratops", "stegosaurus"];
  if (!validDinos.includes(dinoId)) {
    console.warn("Invalid dino ID: " + dinoId);
    return;
  }

  store.batch(() => {
    store.setState({
      selectedDino: dinoId,
      currentScreen: "dressing",
      appliedClothing: [],
      activeCategory: "hats",
    }, "selectDino");
  });
}

/**
 * Apply a clothing item to the dinosaur.
 * Handles conflict rules:
 * - Replaces existing item in same category (max 1, or 2 for accessories)
 * - Skateboard removes all footwear; footwear removes skateboard
 *
 * @param {string} itemId
 */
export function applyClothing(itemId) {
  const meta = getItemMeta(itemId);
  if (!meta) {
    console.warn("Unknown clothing item: " + itemId);
    return;
  }

  const state = store.getState();
  let applied = [...state.appliedClothing];

  // If item is already applied, do nothing
  if (applied.includes(itemId)) return;

  const category = meta.category;
  const maxItems = MAX_ITEMS_PER_CATEGORY[category] || 1;

  // Skateboard <-> Footwear conflict
  if (itemId === "skateboard") {
    applied = applied.filter((id) => {
      const m = getItemMeta(id);
      return !m || m.category !== "footwear";
    });
  } else if (category === "footwear") {
    applied = applied.filter((id) => id !== "skateboard");
  }

  // Category slot limit
  const categoryItems = getItemsInCategory(applied, category);
  if (categoryItems.length >= maxItems) {
    const toRemove = categoryItems.slice(0, categoryItems.length - maxItems + 1);
    applied = applied.filter((id) => !toRemove.includes(id));
  }

  applied.push(itemId);
  store.setState({ appliedClothing: applied }, "applyClothing");
}

/**
 * Remove a clothing item from the dinosaur.
 * @param {string} itemId
 */
export function removeClothing(itemId) {
  const state = store.getState();
  const applied = state.appliedClothing.filter((id) => id !== itemId);

  if (applied.length !== state.appliedClothing.length) {
    store.setState({ appliedClothing: applied }, "removeClothing");
  }
}

/**
 * Toggle a clothing item on/off.
 * @param {string} itemId
 */
export function toggleClothing(itemId) {
  const state = store.getState();
  if (state.appliedClothing.includes(itemId)) {
    removeClothing(itemId);
  } else {
    applyClothing(itemId);
  }
}

/**
 * Remove all clothing from the dinosaur.
 */
export function clearAllClothing() {
  store.setState({ appliedClothing: [] }, "clearAll");
}

/**
 * Apply a random outfit to the current dinosaur.
 * Picks one random item from each category (2 for accessories).
 */
export function randomizeOutfit() {
  const clothing = ASSET_MANIFEST.clothing;
  const allItems = Object.entries(clothing);
  const newOutfit = [];

  // Group items by category
  const byCategory = {};
  for (const [id, meta] of allItems) {
    if (!byCategory[meta.category]) byCategory[meta.category] = [];
    byCategory[meta.category].push(id);
  }

  // Pick random item(s) from each category
  for (const [category, items] of Object.entries(byCategory)) {
    const maxItems = MAX_ITEMS_PER_CATEGORY[category] || 1;
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, maxItems);
    newOutfit.push(...picked);
  }

  // Handle skateboard <-> footwear conflict
  const hasSkateboard = newOutfit.includes("skateboard");
  const footwear = newOutfit.filter((id) => {
    const m = getItemMeta(id);
    return m && m.category === "footwear";
  });

  if (hasSkateboard && footwear.length > 0) {
    if (Math.random() > 0.5) {
      const footSet = new Set(footwear);
      const filtered = newOutfit.filter((id) => !footSet.has(id));
      store.setState({ appliedClothing: filtered }, "randomize");
      return;
    } else {
      const filtered = newOutfit.filter((id) => id !== "skateboard");
      store.setState({ appliedClothing: filtered }, "randomize");
      return;
    }
  }

  store.setState({ appliedClothing: newOutfit }, "randomize");
}

/**
 * Change the active clothing category in the sidebar.
 * @param {string} categoryId
 */
export function setActiveCategory(categoryId) {
  store.setState({ activeCategory: categoryId }, "setActiveCategory");
}

/** Transition to the finished screen. */
export function finishDressing() {
  store.setState({ currentScreen: "finished" }, "finish");
}

/** Return to the dressing screen from the finished screen. */
export function dressAgain() {
  store.setState({ currentScreen: "dressing" }, "dressAgain");
}

/** Start over with a new dinosaur (return to selection screen). */
export function startOver() {
  store.batch(() => {
    store.setState({
      currentScreen: "select",
      selectedDino: null,
      appliedClothing: [],
      activeCategory: "hats",
    }, "startOver");
  });
}

/** Go back from dressing to selection. */
export function goBack() {
  startOver();
}

/**
 * Update drag state.
 * @param {Object} dragUpdate
 */
export function updateDragState(dragUpdate) {
  const state = store.getState();
  store.setState({
    dragState: { ...state.dragState, ...dragUpdate },
  }, "updateDrag");
}

/**
 * Update loading state.
 * @param {number} progress - 0 to 1
 * @param {string} [message]
 */
export function setLoadingProgress(progress, message) {
  const update = { loadingProgress: progress, isLoading: progress < 1 };
  if (message) update.loadingMessage = message;
  store.setState(update, "loading");
}

/**
 * Set the rendering mode.
 * @param {"webgpu"|"canvas2d"} mode
 */
export function setRenderMode(mode) {
  store.setState({ renderMode: mode }, "setRenderMode");
}

