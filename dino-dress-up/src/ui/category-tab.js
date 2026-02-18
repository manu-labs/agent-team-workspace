/**
 * category-tab.js
 * ──────────────────────────────────────────────────────────────────────────
 * Category tab component for the clothing sidebar.
 *
 * Each tab represents one clothing category (e.g. Hats, Shirts, Shoes).
 * Tabs sit in a horizontal scrollable strip at the top of the sidebar.
 * The active tab highlights with a green underline and raised background.
 *
 * Usage
 * ─────
 *   const tab = new CategoryTab({
 *     id:    'hats',
 *     label: 'Hats',
 *     icon:  '🎩',
 *     order: 1,
 *   }, {
 *     onClick: (categoryId) => panel.setCategory(categoryId),
 *   });
 *
 *   tabStripEl.appendChild(tab.element);
 *   tab.setActive(true);   // highlight this tab
 *   tab.destroy();         // clean up when panel is destroyed
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

import { createElement } from '../utils/dom-helpers.js';

// ─── CategoryTab Class ────────────────────────────────────────────────────────

export class CategoryTab {
  /**
   * @param {Object} category - Category descriptor.
   * @param {string} category.id    - Unique category id (e.g. 'hats').
   * @param {string} category.label - Human-readable label (e.g. 'Hats').
   * @param {string} [category.icon='📦'] - Emoji or SVG string for the tab icon.
   * @param {number} [category.order=0]   - Render order (lower → appears first).
   * @param {number} [category.count]     - Optional item count badge.
   *
   * @param {Object} [options={}]
   * @param {Function} [options.onClick] - Called with `(categoryId)` on activation.
   * @param {string}   [options.activeColor='#388e3c'] - Active underline colour.
   */
  constructor(category, options = {}) {
    if (!category || !category.id) {
      throw new Error('CategoryTab: `category.id` is required.');
    }

    this._category = {
      icon:  '📦',
      order: 0,
      ...category,
    };
    this._options = {
      activeColor: '#388e3c',
      ...options,
    };

    this._el      = null;
    this._iconEl  = null;
    this._labelEl = null;
    this._countEl = null;
    this._active  = false;

    // Bound event handlers for clean removal.
    this._handleClick  = this._onClick.bind(this);
    this._handleKeydown = this._onKeydown.bind(this);

    this._render();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** The root `<button>` element — append to the tab strip. */
  get element() { return this._el; }

  /** The category id this tab represents. */
  get categoryId() { return this._category.id; }

  /**
   * Mark this tab as active (or inactive).
   *
   * Active state:
   *  - Adds / removes the `active` CSS class.
   *  - Updates aria-selected for screen-reader accessibility.
   *
   * @param {boolean} isActive
   */
  setActive(isActive) {
    if (this._active === isActive) return;
    this._active = isActive;

    this._el.classList.toggle('active', isActive);
    this._el.setAttribute('aria-selected', String(isActive));
    this._el.setAttribute('tabindex', isActive ? '0' : '-1');
  }

  /**
   * Update the item count badge on the tab.
   * Pass `null` or `undefined` to hide the badge.
   *
   * @param {number|null} count
   */
  setCount(count) {
    this._category.count = count;
    if (this._countEl) {
      if (count != null && count > 0) {
        this._countEl.textContent = count > 99 ? '99+' : String(count);
        this._countEl.classList.remove('hidden');
      } else {
        this._countEl.classList.add('hidden');
      }
    }
  }

  /**
   * Remove event listeners and detach the element from the DOM.
   */
  destroy() {
    if (this._el) {
      this._el.removeEventListener('click',   this._handleClick);
      this._el.removeEventListener('keydown', this._handleKeydown);
      this._el.remove();
      this._el = null;
    }
  }

  // ── Private — Rendering ────────────────────────────────────────────────────

  /**
   * Build the tab DOM:
   *
   *  button.category-tab[role=tab][aria-selected][data-category-id]
   *    └─ span.category-tab-icon   (emoji or inline SVG)
   *    └─ span.category-tab-label  (text label)
   *    └─ span.category-tab-count  (optional count badge — hidden if 0)
   */
  _render() {
    // ── Icon ──
    this._iconEl = createElement('span', {
      className:  'category-tab-icon',
      ariaHidden: 'true',
    });
    // Allow both plain emoji strings and raw SVG markup.
    if (this._category.icon.trim().startsWith('<')) {
      this._iconEl.innerHTML = this._category.icon;
    } else {
      this._iconEl.textContent = this._category.icon;
    }

    // ── Label ──
    this._labelEl = createElement('span', {
      className:   'category-tab-label',
      textContent: this._category.label,
    });

    // ── Count badge (hidden initially if no count) ──
    const hasCount = this._category.count != null && this._category.count > 0;
    this._countEl = createElement('span', {
      className:   `category-tab-count${hasCount ? '' : ' hidden'}`,
      textContent: hasCount
        ? (this._category.count > 99 ? '99+' : String(this._category.count))
        : '',
      ariaHidden:  'true',
    });

    // ── Root button ──
    this._el = createElement('button', {
      className:      'category-tab',
      role:           'tab',
      type:           'button',
      'aria-selected':  'false',
      'aria-controls':  'item-grid',
      'aria-label':     `${this._category.label} clothing items`,
      'data-category-id': this._category.id,
      tabindex:       '-1',
    }, [this._iconEl, this._labelEl, this._countEl]);

    // ── Event listeners ──
    this._el.addEventListener('click',   this._handleClick);
    this._el.addEventListener('keydown', this._handleKeydown);
  }

  // ── Private — Event Handlers ───────────────────────────────────────────────

  /** Click → notify parent panel via the onClick callback. */
  _onClick() {
    if (this._active) return;  // already active — no-op
    if (typeof this._options.onClick === 'function') {
      this._options.onClick(this._category.id);
    }
  }

  /**
   * Keyboard navigation within the tab strip.
   *
   * ArrowRight / ArrowLeft cycle between sibling tabs.
   * Enter / Space activate the focused tab (same as click).
   *
   * @param {KeyboardEvent} e
   */
  _onKeydown(e) {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        this._onClick();
        break;

      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault();
        const next = this._el.nextElementSibling;
        if (next) next.focus();
        break;
      }

      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault();
        const prev = this._el.previousElementSibling;
        if (prev) prev.focus();
        break;
      }

      case 'Home': {
        e.preventDefault();
        const first = this._el.parentElement?.firstElementChild;
        if (first) first.focus();
        break;
      }

      case 'End': {
        e.preventDefault();
        const last = this._el.parentElement?.lastElementChild;
        if (last) last.focus();
        break;
      }

      default:
        break;
    }
  }
}

// ─── Factory: Build All Tabs from a Category Array ───────────────────────────

/**
 * Convenience factory that creates and returns an array of CategoryTab
 * instances sorted by their `order` property.
 *
 * @param {Object[]} categories - Array of category descriptors.
 * @param {Object}   options    - Shared options forwarded to each CategoryTab.
 * @returns {CategoryTab[]}
 */
export function buildCategoryTabs(categories, options = {}) {
  return [...categories]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(cat => new CategoryTab(cat, options));
}