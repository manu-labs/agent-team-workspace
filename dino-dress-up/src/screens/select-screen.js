/**
 * select-screen.js - Dinosaur selection screen controller
 * ──────────────────────────────────────────────────────────────────────────
 * Bridges the state management layer to the dinosaur selection UI.
 *
 * Responsibilities:
 *  - Renders the selection screen with a title, subtitle, and a grid of
 *    DinoPreviewCard instances (one per dinosaur in DINO_PATHS)
 *  - Delegates dino selection to the `selectDino` action
 *  - Manages its own DOM lifecycle (show / hide / destroy)
 *
 * The selection screen is the first screen the player sees. Once a
 * dinosaur is chosen, the store transitions to the "dressing" screen
 * and this controller hides itself.
 *
 * @module screens/select-screen
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

import { store }                            from '../state/store.js';
import { selectDino }                       from '../state/actions.js';
import { DinoPreviewCard, buildDinoCards }  from '../ui/dino-preview-card.js';
import { DINO_PATHS }                       from '../assets/dino-paths.js';
import { ASSET_MANIFEST }                   from '../assets/asset-manifest.js';
import { createElement, $, clearChildren }  from '../utils/dom-helpers.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT }      from '../utils/constants.js';

// ─── SelectScreen Class ───────────────────────────────────────────────────────

export class SelectScreen {
  /**
   * Create a new SelectScreen controller.
   *
   * @param {Object} [options={}]
   * @param {HTMLElement} [options.container] - The screen container element.
   *   Falls back to querying for `.screen-selection` in the DOM.
   */
  constructor(options = {}) {
    /** @type {HTMLElement} Root container for the selection screen */
    this._container = options.container || $('.screen-selection') || this._createContainer();

    /** @type {DinoPreviewCard[]} Active card component instances */
    this._cards = [];

    /** @type {Function|null} Store unsubscribe handle */
    this._unsubscribe = null;

    /** @type {boolean} Whether the screen is currently visible */
    this._visible = false;

    /** @type {boolean} Whether init() has been called */
    this._initialized = false;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Initialize the screen controller.
   * Called once during app bootstrap to set up subscriptions and
   * prepare the initial render.
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    // Build the selection UI so it is ready when onEnter() is called
    this._buildUI();
  }

  /**
   * Called by the ScreenManager when this screen becomes active.
   * Shows the container and refreshes the dino cards.
   */
  onEnter() {
    this.show();
  }

  /**
   * Called by the ScreenManager when this screen is being hidden.
   */
  onExit() {
    this.hide();
  }

  /**
   * Show the selection screen.
   *
   * Builds the full selection UI: a heading, subtitle text, and a grid
   * of DinoPreviewCard components. Each card dispatches `selectDino()`
   * when clicked.
   */
  show() {
    if (\!this._initialized) {
      this._buildUI();
      this._initialized = true;
    }

    // Make the container visible
    this._container.classList.remove('hidden');
    this._visible = true;
  }

  /**
   * Hide the selection screen.
   *
   * Adds the `hidden` CSS class to the container. Does not destroy
   * card instances — call `destroy()` for full cleanup.
   */
  hide() {
    this._container.classList.add('hidden');
    this._visible = false;
  }

  /**
   * Clean up all event listeners, card instances, and subscriptions.
   * Call this when the screen is being permanently removed.
   */
  destroy() {
    this._destroyCards();

    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }

    clearChildren(this._container);
    this._visible = false;
    this._initialized = false;
  }

  // ── Private — UI Building ──────────────────────────────────────────────────

  /**
   * Build the full selection UI inside the container.
   * @private
   */
  _buildUI() {
    this._destroyCards();

    // Check if the container already has static HTML from index.html
    const existingGrid = this._container.querySelector('.dino-card-grid');
    const grid = existingGrid || createElement('div', {
      className: 'dino-card-grid',
      role:      'list',
      'aria-label': 'Available dinosaurs',
    });

    // Clear any placeholder content from the grid
    clearChildren(grid);

    // Build one card per dinosaur entry.
    const dinoEntries = this._getDinoEntries();

    for (const dinoMeta of dinoEntries) {
      const pathData = DINO_PATHS[dinoMeta.id];
      if (\!pathData) continue;

      // Create a mini preview canvas for the card
      const previewCanvas = this._createPreviewCanvas(dinoMeta.id, pathData);

      const card = new DinoPreviewCard(
        {
          id:          dinoMeta.id,
          name:        pathData.name || dinoMeta.name || dinoMeta.id,
          subtitle:    pathData.subtitle || dinoMeta.subtitle || '',
          description: this._getDescription(dinoMeta.id),
          accentColor: this._getAccentColor(dinoMeta.id),
        },
        previewCanvas,
        {
          onClick: (dinoId) => this._handleSelect(dinoId),
        },
      );

      grid.appendChild(card.element);
      this._cards.push(card);
    }

    // Append grid if we created a new one
    if (\!existingGrid) {
      this._container.appendChild(grid);
    }
  }

  // ── Private — Card Management ──────────────────────────────────────────────

  /**
   * Destroy all active DinoPreviewCard instances.
   * @private
   */
  _destroyCards() {
    for (const card of this._cards) {
      try {
        card.destroy();
      } catch (err) {
        console.error('SelectScreen: error destroying card:', err);
      }
    }
    this._cards = [];
  }

  // ── Private — Data Helpers ─────────────────────────────────────────────────

  /**
   * Return an ordered array of dino metadata objects.
   *
   * Uses ASSET_MANIFEST.dinosaurs when available (for consistent ordering),
   * otherwise falls back to DINO_PATHS keys.
   *
   * @private
   * @returns {Array<{id: string, name: string, subtitle: string}>}
   */
  _getDinoEntries() {
    if (ASSET_MANIFEST.dinosaurs && ASSET_MANIFEST.dinosaurs.length > 0) {
      return [...ASSET_MANIFEST.dinosaurs].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
    }
    return Object.keys(DINO_PATHS).map((id) => ({
      id,
      name:     DINO_PATHS[id].name || id,
      subtitle: DINO_PATHS[id].subtitle || '',
    }));
  }

  /**
   * Get a fun description string for a dino.
   *
   * @private
   * @param {string} dinoId
   * @returns {string}
   */
  _getDescription(dinoId) {
    const descriptions = {
      trex:         'Tiny arms, big style\! This fearsome fashionista is ready for a makeover.',
      triceratops:  'Three horns, infinite charm\! Cera loves a good accessory.',
      stegosaurus:  'Plates up, dressed to impress\! Steggy is the runway star.',
    };
    return descriptions[dinoId] || 'A stylish dinosaur awaiting your creative touch.';
  }

  /**
   * Get the accent colour for a dino card.
   *
   * @private
   * @param {string} dinoId
   * @returns {string} CSS colour value
   */
  _getAccentColor(dinoId) {
    const colors = {
      trex:         '#4caf50',
      triceratops:  '#ff9800',
      stegosaurus:  '#2196f3',
    };
    return colors[dinoId] || '#4caf50';
  }

  // ── Private — Canvas Preview ───────────────────────────────────────────────

  /**
   * Create a mini canvas element with a rasterised preview of the dino.
   *
   * The canvas is sized to fit neatly inside a DinoPreviewCard. The dino
   * SVG paths are scaled to fill 85% of the canvas area.
   *
   * @private
   * @param {string} dinoId
   * @param {Object} pathData - Entry from DINO_PATHS (width, height, paths)
   * @returns {HTMLCanvasElement}
   */
  _createPreviewCanvas(dinoId, pathData) {
    const PREVIEW_SIZE = 180;
    const canvas = createElement('canvas', {
      className: 'dino-preview-canvas',
    });
    canvas.width  = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;

    const ctx = canvas.getContext('2d');
    if (\!ctx || \!pathData.paths) return canvas;

    const scaleX = PREVIEW_SIZE / pathData.width;
    const scaleY = PREVIEW_SIZE / pathData.height;
    const scale  = Math.min(scaleX, scaleY) * 0.85;

    const offsetX = (PREVIEW_SIZE - pathData.width * scale) / 2;
    const offsetY = (PREVIEW_SIZE - pathData.height * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    for (const segment of pathData.paths) {
      ctx.save();

      const path = new Path2D(segment.d);

      if (segment.opacity \!== undefined) {
        ctx.globalAlpha = segment.opacity;
      }

      if (segment.fill && segment.fill \!== 'none') {
        ctx.fillStyle = segment.fill;
        ctx.fill(path);
      }

      if (segment.stroke && segment.stroke \!== 'none') {
        ctx.strokeStyle = segment.stroke;
        ctx.lineWidth   = segment.strokeWidth || 1;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.stroke(path);
      }

      ctx.restore();
    }

    ctx.restore();
    return canvas;
  }

  // ── Private — Container Creation ───────────────────────────────────────────

  /**
   * Create the `.screen-selection` container element if it does not
   * already exist in the DOM.
   *
   * @private
   * @returns {HTMLElement}
   */
  _createContainer() {
    const container = createElement('section', {
      className:    'screen-selection hidden',
      'aria-label': 'Dinosaur selection screen',
    });

    const app = $('#app') || document.body;
    app.appendChild(container);

    return container;
  }

  // ── Private — Event Handlers ───────────────────────────────────────────────

  /**
   * Handle a dino card selection.
   *
   * Marks the selected card visually, then dispatches the `selectDino`
   * action to transition the game state to the dressing screen.
   *
   * @private
   * @param {string} dinoId
   */
  _handleSelect(dinoId) {
    // Visually mark the chosen card as selected
    for (const card of this._cards) {
      card.setSelected(card.dinoId === dinoId);
    }

    // Dispatch the state action (transitions to dressing screen)
    selectDino(dinoId);
  }
}