/**
 * screen-manager.js - Screen transition manager
 * Part of the Dino Dress-Up state management system
 *
 * Manages screen visibility based on the store's currentScreen state.
 * Handles CSS transitions between screens (fade/slide).
 */

import { store } from "../state/store.js";

export class ScreenManager {
  /**
   * @param {Object} screens - Map of screen ID to DOM element
   * @param {HTMLElement} screens.select - Selection screen element
   * @param {HTMLElement} screens.dressing - Dressing room element
   * @param {HTMLElement} [screens.finished] - Finished screen element
   */
  constructor(screens) {
    this._screens = screens;
    this._currentScreen = null;
    this._onScreenChange = null;

    // Subscribe to screen changes
    this._unsub = store.subscribe("currentScreen", (state) => {
      this._transitionTo(state.currentScreen);
    });
  }

  /**
   * Set an optional callback for screen transitions.
   * Called after the new screen is shown.
   * @param {Function} callback - (screenName) => void
   */
  onTransition(callback) {
    this._onScreenChange = callback;
  }

  /**
   * Initialize the screen manager with the current state.
   * Call once after DOM is ready.
   */
  init() {
    const state = store.getState();
    this._showScreen(state.currentScreen);
    this._currentScreen = state.currentScreen;
  }

  /**
   * Transition to a new screen with animation.
   * @param {string} screenName
   */
  _transitionTo(screenName) {
    if (screenName === this._currentScreen) return;

    const outEl = this._screens[this._currentScreen];
    const inEl = this._screens[screenName];

    // Hide old screen
    if (outEl) {
      outEl.classList.remove("active");
      outEl.classList.add("hidden");
    }

    // Show new screen
    if (inEl) {
      inEl.classList.remove("hidden");
      // Trigger reflow for animation
      void inEl.offsetHeight;
      inEl.classList.add("active");
    }

    this._currentScreen = screenName;

    // Notify callback
    if (this._onScreenChange) {
      this._onScreenChange(screenName);
    }
  }

  /**
   * Show a screen without animation (used for initial state).
   * @param {string} screenName
   */
  _showScreen(screenName) {
    for (const [name, el] of Object.entries(this._screens)) {
      if (!el) continue;
      if (name === screenName) {
        el.classList.remove("hidden");
        el.classList.add("active");
      } else {
        el.classList.add("hidden");
        el.classList.remove("active");
      }
    }
  }

  /**
   * Clean up subscriptions.
   */
  destroy() {
    if (this._unsub) this._unsub();
  }
}
