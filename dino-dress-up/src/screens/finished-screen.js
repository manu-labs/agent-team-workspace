/**
 * finished-screen.js - Finished / celebration screen controller
 * ──────────────────────────────────────────────────────────────────────────
 * The "admire your creation" screen. Shown after the player clicks "Done"
 * in the dressing room.
 *
 * Responsibilities:
 *  - Display a "Looking Great!" title with the dressed dinosaur
 *  - Provide action buttons: Save Image, Dress Again, New Dino
 *  - Trigger a confetti celebration animation on show
 *  - Handle image export (canvas -> PNG download)
 *
 * @module screens/finished-screen
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

import { store }                        from '../state/store.js';
import { dressAgain, startOver }        from '../state/actions.js';
import { createElement, $, clearChildren } from '../utils/dom-helpers.js';
import { bounceIn, spawnConfetti }      from '../ui/animations.js';

// ─── FinishedScreen Class ─────────────────────────────────────────────────────

export class FinishedScreen {
  /**
   * Create a new FinishedScreen controller.
   *
   * @param {Object} options
   * @param {HTMLElement}                            options.container - The finished screen container element
   * @param {import('../core/renderer.js').Renderer} options.renderer  - Shared renderer (for canvas access)
   */
  constructor({ container, renderer }) {
    /** @type {HTMLElement} */
    this._container = container;

    /** @type {import('../core/renderer.js').Renderer} */
    this._renderer = renderer;

    /** @type {number|null} Confetti cleanup timer */
    this._confettiTimer = null;

    /** @type {HTMLElement|null} Cached reference to the action button group */
    this._btnGroup = null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Initialize the finished screen.
   *
   * Wires up event listeners on existing DOM elements (buttons with
   * `data-action` attributes).
   */
  init() {
    const btnSave       = this._container.querySelector('[data-action=save]');
    const btnDressAgain = this._container.querySelector('[data-action=dress-again]');
    const btnNewDino    = this._container.querySelector('[data-action=new-dino]');

    if (btnSave)       btnSave.addEventListener('click', () => this._saveImage());
    if (btnDressAgain) btnDressAgain.addEventListener('click', () => this._onDressAgain());
    if (btnNewDino)    btnNewDino.addEventListener('click', () => this._onNewDino());
  }

  /**
   * Show the finished screen.
   *
   * Builds the celebration UI if it hasn't been built yet, updates the
   * title with the dino name, and triggers the confetti animation.
   */
  show() {
    this._container.classList.remove('hidden');
    this._buildUI();
    this._triggerConfetti();
  }

  /**
   * Hide the finished screen.
   *
   * Stops any running confetti animation and hides the container.
   */
  hide() {
    this._container.classList.add('hidden');
    this._cleanupConfetti();
  }

  /**
   * Clean up all resources: timers, DOM references, and confetti.
   */
  destroy() {
    this._cleanupConfetti();
    this._btnGroup = null;
  }

  // ── Screen Manager Hooks ───────────────────────────────────────────────────

  /**
   * Called by the ScreenManager when this screen becomes active.
   * Triggers the confetti burst.
   */
  onEnter() {
    this._triggerConfetti();
  }

  /**
   * Called by the ScreenManager when this screen is hidden.
   * Cleans up the confetti animation.
   */
  onExit() {
    this._cleanupConfetti();
  }

  // ── Private — UI Building ──────────────────────────────────────────────────

  /**
   * Build or refresh the celebration UI elements.
   *
   * Creates a "Looking Great!" header, a snapshot area showing the
   * current canvas state, and a row of action buttons.
   *
   * @private
   */
  _buildUI() {
    // Only build dynamic elements if needed — the base HTML already
    // contains the container and data-action buttons.

    // Update the celebration title with the dino name
    const titleEl = this._container.querySelector('.finished-title');
    if (titleEl) {
      titleEl.textContent = 'Looking Great!';
    }

    // Update the subtitle with the dino name
    const subtitleEl = this._container.querySelector('.finished-subtitle');
    if (subtitleEl) {
      const state    = store.getState();
      const dinoName = this._getDinoName(state.selectedDino);
      subtitleEl.textContent = dinoName + ' is ready to take on the world!';
    }

    // Animate the title in
    if (titleEl) {
      bounceIn(titleEl, 400).catch(() => {});
    }
  }

  // ── Private — Image Export ─────────────────────────────────────────────────

  /**
   * Save the current canvas as a PNG image download.
   *
   * Captures the WebGPU/Canvas2D canvas content, converts it to a PNG
   * blob, and programmatically triggers a download. The file is named
   * after the selected dinosaur.
   *
   * @private
   */
  _saveImage() {
    const canvas = this._renderer?.gpuContext?.canvas;
    if (!canvas) {
      console.warn('FinishedScreen: no canvas available for export');
      return;
    }

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.warn('FinishedScreen: could not create image blob');
          return;
        }

        const url  = URL.createObjectURL(blob);
        const link = createElement('a', {
          style: { display: 'none' },
        });

        const state    = store.getState();
        const dinoName = state.selectedDino || 'dino';
        link.download  = dinoName + '-dressed-up.png';
        link.href      = url;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Release the object URL to free memory
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('FinishedScreen: failed to save image:', err);
      alert('Could not save the image. Try using a screenshot instead.');
    }
  }

  // ── Private — Action Handlers ──────────────────────────────────────────────

  /**
   * Handle the "Dress Again" button.
   *
   * Dispatches the `dressAgain` action which returns the player to the
   * dressing screen with the same dino and outfit intact.
   *
   * @private
   */
  _onDressAgain() {
    dressAgain();
  }

  /**
   * Handle the "New Dino" button.
   *
   * Dispatches the `startOver` action which resets state and returns
   * the player to the dinosaur selection screen.
   *
   * @private
   */
  _onNewDino() {
    startOver();
  }

  // ── Private — Confetti Animation ───────────────────────────────────────────

  /**
   * Trigger a celebratory confetti burst.
   *
   * Spawns confetti particles in the center of the container using the
   * `spawnConfetti` animation utility. Sets a cleanup timer to remove
   * residual DOM particles after the animation ends.
   *
   * @private
   */
  _triggerConfetti() {
    this._cleanupConfetti();

    // Use the confetti layer if available, otherwise fall back to container
    const confettiLayer = document.getElementById('confetti-layer');

    // Spawn confetti from the center of the screen
    const rect   = this._container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height * 0.35;

    spawnConfetti(centerX, centerY, 40, confettiLayer || this._container);

    // Clean up confetti DOM nodes after animation completes
    this._confettiTimer = setTimeout(() => {
      const layer = document.getElementById('confetti-layer');
      if (layer) {
        clearChildren(layer);
      }
      this._confettiTimer = null;
    }, 3500);
  }

  /**
   * Stop and clean up any running confetti animation.
   *
   * @private
   */
  _cleanupConfetti() {
    if (this._confettiTimer) {
      clearTimeout(this._confettiTimer);
      this._confettiTimer = null;
    }

    const layer = document.getElementById('confetti-layer');
    if (layer) {
      clearChildren(layer);
    }
  }

  // ── Private — Helpers ──────────────────────────────────────────────────────

  /**
   * Get the display name for a dinosaur ID.
   *
   * @private
   * @param {string|null} dinoId
   * @returns {string} Human-readable dino name
   */
  _getDinoName(dinoId) {
    if (!dinoId) return 'Your dino';

    const names = {
      trex:         'Rex',
      triceratops:  'Cera',
      stegosaurus:  'Steggy',
    };

    return names[dinoId] || dinoId;
  }
}