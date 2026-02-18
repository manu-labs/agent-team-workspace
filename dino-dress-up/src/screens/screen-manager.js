/**
 * screen-manager.js - Screen transition manager
 * Part of the Dino Dress-Up state management system
 *
 * Manages transitions between the three game screens:
 *   - "select"   -> Dinosaur selection screen
 *   - "dressing" -> Main dressing room
 *   - "finished" -> Final dressed view
 *
 * Listens to store.currentScreen changes and shows/hides
 * the corresponding DOM sections with CSS transitions.
 */

import { store } from "../state/store.js";

/** Screen ID -> DOM element ID */
const SCREEN_ELEMENTS = new Map([
  ["select",   "screen-selection"],
  ["dressing", "screen-dressing"],
  ["finished", "screen-finished"],
]);

const ACTIVE_CLASS = "screen-active";
const HIDDEN_CLASS = "hidden";

export class ScreenManager {
  constructor() {
    /** @type {Map<string, HTMLElement>} Resolved DOM elements */
    this._screens = new Map();

    /** @type {string|null} Currently active screen ID */
    this._currentScreen = null;

    /** @type {Function|null} Store unsubscribe function */
    this._unsubscribe = null;

    /** @type {Map<string, Function>} Screen enter/exit callbacks */
    this._onEnter = new Map();
    this._onExit = new Map();
  }

  /**
   * Initialize the screen manager.
   * Resolves DOM elements and subscribes to store changes.
   */
  init() {
    for (const [screenId, elementId] of SCREEN_ELEMENTS) {
      const el = document.getElementById(elementId);
      if (el) {
        this._screens.set(screenId, el);
      } else {
        console.warn("ScreenManager: element #" + elementId + " not found");
      }
    }

    this._unsubscribe = store.subscribe("currentScreen", (state) => {
      this._transition(state.currentScreen);
    });

    const initialScreen = store.get("currentScreen") || "select";
    this._transition(initialScreen);
  }

  /**
   * Register a callback for when a screen becomes active.
   * @param {string} screenId
   * @param {Function} callback
   */
  onEnter(screenId, callback) {
    this._onEnter.set(screenId, callback);
  }

  /**
   * Register a callback for when a screen is hidden.
   * @param {string} screenId
   * @param {Function} callback
   */
  onExit(screenId, callback) {
    this._onExit.set(screenId, callback);
  }

  /**
   * Transition to a new screen.
   * @param {string} newScreen
   */
  _transition(newScreen) {
    if (newScreen === this._currentScreen) return;

    const oldScreen = this._currentScreen;

    // Call exit callback for old screen
    if (oldScreen) {
      const exitCb = this._onExit.get(oldScreen);
      if (exitCb) {
        try { exitCb(); } catch (e) { console.error("Screen exit error:", e); }
      }
    }

    // Hide all screens
    for (const [id, el] of this._screens) {
      el.classList.remove(ACTIVE_CLASS);
      el.classList.add(HIDDEN_CLASS);
    }

    // Show the new screen
    const newEl = this._screens.get(newScreen);
    if (newEl) {
      newEl.classList.remove(HIDDEN_CLASS);
      // Force reflow before adding active class (for CSS transition)
      void newEl.offsetHeight;
      newEl.classList.add(ACTIVE_CLASS);
    }

    this._currentScreen = newScreen;

    // Call enter callback for new screen
    const enterCb = this._onEnter.get(newScreen);
    if (enterCb) {
      try { enterCb(); } catch (e) { console.error("Screen enter error:", e); }
    }
  }

  /**
   * Get the currently active screen ID.
   * @returns {string|null}
   */
  getCurrentScreen() {
    return this._currentScreen;
  }

  /**
   * Clean up event listeners and subscriptions.
   */
  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._onEnter.clear();
    this._onExit.clear();
    this._screens.clear();
  }
}
