/**
 * item-thumbnail.js
 * ──────────────────────────────────────────────────────────────────────────
 * Clothing item thumbnail component.
 *
 * Renders a single clickable cell in the clothing item grid with:
 *  - An SVG icon preview area
 *  - An item name label
 *  - An "applied" state badge (green checkmark)
 *  - A loading spinner overlay
 *  - Drag-and-drop data transfer support (HTML5 drag API)
 *
 * Usage
 * ─────
 *   const thumb = new ItemThumbnail('hat_tophat', {
 *     name: 'Top Hat',
 *     icon: '<svg>…</svg>',   // SVG string for the preview icon
 *     category: 'hats',
 *   }, {
 *     onClick: (itemId) => applyItem(itemId),
 *   });
 *
 *   gridEl.appendChild(thumb.element);
 *   thumb.setApplied(true);   // show green checkmark badge
 *   thumb.setLoading(true);   // show loading spinner
 *
 * Clean up
 * ────────
 *   thumb.destroy();          // removes event listeners + DOM element
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

import { createElement, createSVGElement, setAttributes } from '../utils/dom-helpers.js';
import { bounceIn } from './animations.js';

// ─── ItemThumbnail Class ──────────────────────────────────────────────────────

export class ItemThumbnail {
  /**
   * @param {string} itemId - Unique identifier for the clothing item
   *   (e.g. 'hat_tophat', 'shirt_rainbow').
   * @param {Object} itemMeta - Metadata about the item.
   * @param {string} itemMeta.name     - Display name (e.g. 'Top Hat').
   * @param {string} [itemMeta.icon]   - Raw SVG string for the preview icon.
   *   If omitted a default placeholder SVG is used.
   * @param {string} [itemMeta.category] - Category id this item belongs to.
   * @param {string} [itemMeta.color]  - Optional accent colour for the icon
   *   placeholder background.
   * @param {Object} [options={}]
   * @param {Function} [options.onClick]  - Called with `(itemId)` on click.
   * @param {boolean}  [options.draggable=true] - Enable HTML5 drag.
   */
  constructor(itemId, itemMeta, options = {}) {
    this._itemId  = itemId;
    this._meta    = itemMeta;
    this._options = { draggable: true, ...options };

    this._el        = null;  // root DOM element
    this._badgeEl   = null;  // applied-badge element
    this._spinnerEl = null;  // loading-spinner overlay
    this._iconEl    = null;  // icon container element

    this._applied = false;
    this._loading = false;

    // Bound handlers (needed for proper removeEventListener cleanup).
    this._handleClick    = this._onClick.bind(this);
    this._handleDragStart = this._onDragStart.bind(this);
    this._handleKeydown  = this._onKeydown.bind(this);

    this._render();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** The root DOM element — append this to the item grid. */
  get element() { return this._el; }

  /** The item's unique id. */
  get itemId() { return this._itemId; }

  /**
   * Toggle the "applied" visual state (green border + checkmark badge).
   *
   * When transitioning from not-applied → applied a `bounceIn` animation
   * is played on the badge to celebrate the action.
   *
   * @param {boolean} isApplied
   */
  setApplied(isApplied) {
    if (this._applied === isApplied) return;  // no-op
    this._applied = isApplied;

    this._el.classList.toggle('applied', isApplied);
    this._el.setAttribute('aria-pressed', String(isApplied));

    if (isApplied && this._badgeEl) {
      // Small bounce on the badge to celebrate.
      bounceIn(this._badgeEl, 250).catch(() => {});
    }
  }

  /**
   * Show or hide the loading spinner overlay.
   * While loading, the thumbnail is non-interactive.
   *
   * @param {boolean} isLoading
   */
  setLoading(isLoading) {
    if (this._loading === isLoading) return;
    this._loading = isLoading;

    this._el.classList.toggle('loading', isLoading);
    this._el.setAttribute('aria-busy', String(isLoading));

    if (isLoading) {
      if (!this._spinnerEl) {
        this._spinnerEl = this._buildSpinner();
        this._el.appendChild(this._spinnerEl);
      }
    } else {
      if (this._spinnerEl) {
        this._spinnerEl.remove();
        this._spinnerEl = null;
      }
    }
  }

  /**
   * Update the preview icon SVG.
   * Useful when a high-res icon loads asynchronously after initial render.
   *
   * @param {string} svgString - Raw SVG markup.
   */
  setIcon(svgString) {
    this._meta.icon = svgString;
    if (this._iconEl) {
      this._iconEl.innerHTML = '';
      this._iconEl.innerHTML = svgString || this._buildPlaceholderSVGString();
    }
  }

  /**
   * Remove event listeners and detach the element from the DOM.
   * Call this when the grid is rebuilt or the panel is destroyed.
   */
  destroy() {
    if (this._el) {
      this._el.removeEventListener('click',     this._handleClick);
      this._el.removeEventListener('dragstart', this._handleDragStart);
      this._el.removeEventListener('keydown',   this._handleKeydown);
      this._el.remove();
      this._el = null;
    }
  }

  // ── Private — Rendering ────────────────────────────────────────────────────

  /**
   * Build the full DOM structure for this thumbnail:
   *
   *  div.item-thumbnail[data-item-id][draggable][role=button][aria-pressed]
   *    └─ div.item-icon          (SVG icon preview)
   *    └─ span.item-name         (display name)
   *    └─ div.applied-badge      (checkmark; hidden until applied)
   */
  _render() {
    // ── Icon area ──
    this._iconEl = createElement('div', { className: 'item-icon' });
    if (this._meta.icon) {
      this._iconEl.innerHTML = this._meta.icon;
    } else {
      this._iconEl.innerHTML = this._buildPlaceholderSVGString();
    }

    // ── Name label ──
    const nameEl = createElement('span', {
      className:   'item-name',
      textContent: this._meta.name || this._itemId,
      title:       this._meta.name || this._itemId,
    });

    // ── Applied badge (green checkmark) ──
    this._badgeEl = createElement('div', {
      className:   'applied-badge',
      textContent: '✓',
      ariaHidden:  'true',
    });

    // ── Root element ──
    this._el = createElement('div', {
      className:   'item-thumbnail',
      role:        'button',
      tabindex:    '0',
      'aria-pressed': 'false',
      'aria-label':  `${this._meta.name || this._itemId} clothing item`,
      'data-item-id': this._itemId,
    }, [this._iconEl, nameEl, this._badgeEl]);

    // Drag support
    if (this._options.draggable) {
      setAttributes(this._el, { draggable: 'true' });
    }

    // ── Event listeners ──
    this._el.addEventListener('click',     this._handleClick);
    this._el.addEventListener('keydown',   this._handleKeydown);
    this._el.addEventListener('dragstart', this._handleDragStart);
  }

  /**
   * Build a simple coloured placeholder SVG for items without a custom icon.
   * The colour is derived from the item's category or a fallback rainbow.
   *
   * @returns {string} Raw SVG string.
   */
  _buildPlaceholderSVGString() {
    const colour = this._getCategoryColour();
    const label  = (this._meta.name || this._itemId).charAt(0).toUpperCase();

    // A rounded square with the item's initial letter.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect width="48" height="48" rx="10" fill="${colour}" opacity="0.2"/>
  <text
    x="24" y="32"
    text-anchor="middle"
    font-size="22"
    font-weight="700"
    fill="${colour}"
    font-family="sans-serif"
  >${label}</text>
</svg>`;
  }

  /**
   * Build the spinner overlay element.
   *
   * @returns {HTMLElement}
   */
  _buildSpinner() {
    const spinner = createElement('div', { className: 'spinner' });
    return createElement('div', { className: 'item-thumbnail-spinner' }, [spinner]);
  }

  /**
   * Return a stable accent colour string based on category id.
   * Falls back to an orange if the category is unknown.
   *
   * @returns {string} CSS colour value.
   */
  _getCategoryColour() {
    // Category IDs match ASSET_MANIFEST and constants.js CATEGORIES
    const categoryColours = {
      hats:           '#9c27b0',   // purple
      eyewear:        '#00bcd4',   // cyan
      neckwear:       '#2196f3',   // blue
      tops:           '#4caf50',   // green
      capes:          '#f44336',   // red
      footwear:       '#ff9800',   // orange
      accessories:    '#e91e63',   // pink
      'tail-flair':   '#ffeb3b',   // yellow
    };
    const category = (this._meta.category || '').toLowerCase();
    return categoryColours[category] || '#ff9800';
  }

  // ── Private — Event Handlers ───────────────────────────────────────────────

  /** Click → invoke the onClick callback. */
  _onClick() {
    if (this._loading) return;
    if (typeof this._options.onClick === 'function') {
      this._options.onClick(this._itemId);
    }
  }

  /**
   * Keyboard handler: Space or Enter triggers the click action.
   * Allows the thumbnail to behave as a proper interactive element.
   *
   * @param {KeyboardEvent} e
   */
  _onKeydown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this._onClick();
    }
  }

  /**
   * Dragstart: set the item id on the data transfer so the canvas drop
   * target knows which item was dragged.
   *
   * @param {DragEvent} e
   */
  _onDragStart(e) {
    if (this._loading) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', this._itemId);
    e.dataTransfer.setData('application/dino-item-id', this._itemId);

    this._el.classList.add('dragging');

    // Restore appearance after the drag ends.
    const onDragEnd = () => {
      this._el.classList.remove('dragging');
      this._el.removeEventListener('dragend', onDragEnd);
    };
    this._el.addEventListener('dragend', onDragEnd, { once: true });
  }
}