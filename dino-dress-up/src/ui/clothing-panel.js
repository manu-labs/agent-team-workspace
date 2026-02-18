/**
 * clothing-panel.js
 * ──────────────────────────────────────────────────────────────────────────
 * Main clothing sidebar panel.
 *
 * Manages the complete sidebar UI:
 *  - A horizontal strip of CategoryTab components
 *  - A scrollable grid of ItemThumbnail components
 *  - An "applied items" count in the footer
 *
 * The panel is a pure UI component — it does not own any game state.
 * All state changes are communicated outward via callbacks, and inward
 * via the public API methods (setCategory, setAppliedItems, setItems).
 *
 * Usage
 * ─────
 *   const panel = new ClothingPanel(
 *     document.getElementById('sidebar'),
 *     assetManifest,
 *     {
 *       onItemClick:      (itemId)     => game.toggleItem(itemId),
 *       onCategoryChange: (categoryId) => console.log('category:', categoryId),
 *     }
 *   );
 *
 *   panel.setCategory('hats');
 *   panel.setAppliedItems(['hat_tophat', 'shirt_rainbow']);
 *   panel.destroy();
 *
 * Asset manifest shape (assetManifest)
 * ─────────────────────────────────────
 *   {
 *     categories: [
 *       { id: 'hats', label: 'Hats', icon: '🎩', order: 1 },
 *       ...
 *     ],
 *     items: [
 *       { id: 'hat_tophat', name: 'Top Hat', category: 'hats', icon: '<svg>…</svg>' },
 *       ...
 *     ]
 *   }
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

import { $, clearChildren, createElement } from './dom-helpers.js';
import { CategoryTab, buildCategoryTabs }  from './category-tab.js';
import { ItemThumbnail }                   from './item-thumbnail.js';
import { bounceIn, staggerIn }             from './animations.js';

// ─── ClothingPanel Class ──────────────────────────────────────────────────────

export class ClothingPanel {
  /**
   * @param {Element} container - The sidebar container element (e.g. #sidebar).
   *   The panel expects the following child elements to already exist inside:
   *     - `#category-tabs`       — tab strip nav
   *     - `#item-grid`           — scrollable item grid
   *     - `#sidebar-applied-count` — applied count text span
   *     - `#sidebar-clear-btn`   — optional shortcut clear button
   *
   * @param {Object} assetManifest - Categories and items descriptor (see above).
   *
   * @param {Object} [options={}]
   * @param {Function} [options.onItemClick]
   *   Called with `(itemId)` when the user clicks a clothing item thumbnail.
   * @param {Function} [options.onCategoryChange]
   *   Called with `(categoryId)` when the user switches category tabs.
   * @param {Function} [options.onClearAll]
   *   Called when the sidebar's Clear All shortcut button is clicked.
   * @param {boolean}  [options.staggerItems=true]
   *   Whether to stagger-animate item thumbnails when the grid re-renders.
   */
  constructor(container, assetManifest, options = {}) {
    if (!container) {
      throw new Error('ClothingPanel: `container` element is required.');
    }

    this._container = container;
    this._manifest  = assetManifest || { categories: [], items: [] };
    this._options   = {
      staggerItems: true,
      ...options,
    };

    // Internal state
    this._activeCategoryId = null;
    this._appliedItemIds   = new Set();

    // Child component registries
    /** @type {Map<string, CategoryTab>} categoryId → CategoryTab */
    this._tabs = new Map();
    /** @type {Map<string, ItemThumbnail>} itemId → ItemThumbnail */
    this._thumbnails = new Map();

    // Cached DOM references (resolved once at construction time)
    this._tabStripEl    = $(  '#category-tabs',          container);
    this._gridEl        = $(  '#item-grid',              container);
    this._appliedCountEl= $( '#sidebar-applied-count',   container);
    this._clearBtnEl    = $(  '#sidebar-clear-btn',      container);

    // Initialise sub-components
    this._renderTabs();
    this._attachClearButton();

    // Select the first category automatically (if any exist)
    if (this._manifest.categories.length > 0) {
      const first = [...this._manifest.categories]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
      this.setCategory(first.id);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Switch the active category tab and re-render the item grid
   * with items belonging to that category.
   *
   * @param {string} categoryId
   */
  setCategory(categoryId) {
    if (this._activeCategoryId === categoryId) return;

    // Deactivate old tab
    if (this._activeCategoryId) {
      const oldTab = this._tabs.get(this._activeCategoryId);
      if (oldTab) oldTab.setActive(false);
    }

    this._activeCategoryId = categoryId;

    // Activate new tab
    const newTab = this._tabs.get(categoryId);
    if (newTab) newTab.setActive(true);

    // Scroll the tab into view
    if (newTab?.element) {
      newTab.element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // Filter items for this category and re-render the grid
    const items = this._getItemsForCategory(categoryId);
    this._renderGrid(items);

    // Notify parent
    if (typeof this._options.onCategoryChange === 'function') {
      this._options.onCategoryChange(categoryId);
    }
  }

  /**
   * Update which items are shown with a green "applied" checkmark.
   * Efficiently updates only the thumbnails whose state has changed.
   *
   * @param {string[]|Set<string>} itemIds - Collection of applied item IDs.
   */
  setAppliedItems(itemIds) {
    const newSet = new Set(itemIds);

    // Find items whose state changed.
    const allIds = new Set([...this._appliedItemIds, ...newSet]);
    for (const id of allIds) {
      const wasApplied = this._appliedItemIds.has(id);
      const isApplied  = newSet.has(id);
      if (wasApplied !== isApplied) {
        const thumb = this._thumbnails.get(id);
        if (thumb) thumb.setApplied(isApplied);
      }
    }

    this._appliedItemIds = newSet;
    this._updateAppliedCount();
  }

  /**
   * Completely replace the item grid with a new set of items.
   * Useful when the manifest changes (e.g. unlockable items) or when
   * implementing a search/filter from outside the panel.
   *
   * @param {Object[]} items - Array of item meta objects.
   */
  setItems(items) {
    this._renderGrid(items);
  }

  /**
   * Show / hide a loading skeleton in the item grid.
   * Useful while assets are being fetched asynchronously.
   *
   * @param {boolean} isLoading
   */
  setLoading(isLoading) {
    if (isLoading) {
      this._destroyThumbnails();
      clearChildren(this._gridEl);
      this._gridEl.appendChild(this._buildLoadingGrid());
    } else {
      // Re-render the current category
      if (this._activeCategoryId) {
        const items = this._getItemsForCategory(this._activeCategoryId);
        this._renderGrid(items);
      }
    }
  }

  /**
   * Clean up all child components and event listeners.
   * Call before removing the sidebar from the DOM.
   */
  destroy() {
    this._destroyTabs();
    this._destroyThumbnails();

    if (this._clearBtnEl && this._handleClearClick) {
      this._clearBtnEl.removeEventListener('click', this._handleClearClick);
    }
  }

  // ── Private — Tab Rendering ────────────────────────────────────────────────

  /**
   * Build and inject CategoryTab components for all categories in the manifest.
   * Existing tabs are destroyed first (safe to call multiple times).
   */
  _renderTabs() {
    this._destroyTabs();
    if (!this._tabStripEl) return;

    const tabs = buildCategoryTabs(this._manifest.categories, {
      onClick: (categoryId) => this.setCategory(categoryId),
    });

    for (const tab of tabs) {
      this._tabs.set(tab.categoryId, tab);
      this._tabStripEl.appendChild(tab.element);
    }
  }

  /** Destroy all CategoryTab instances and clear the tab strip. */
  _destroyTabs() {
    for (const tab of this._tabs.values()) {
      tab.destroy();
    }
    this._tabs.clear();
    if (this._tabStripEl) clearChildren(this._tabStripEl);
  }

  // ── Private — Grid Rendering ───────────────────────────────────────────────

  /**
   * Build and inject ItemThumbnail components for the given item array.
   *
   * @param {Object[]} items - Item meta objects to display.
   */
  _renderGrid(items) {
    this._destroyThumbnails();
    if (!this._gridEl) return;
    clearChildren(this._gridEl);

    if (!items || items.length === 0) {
      this._gridEl.appendChild(this._buildEmptyState());
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const item of items) {
      const thumb = new ItemThumbnail(item.id, item, {
        onClick: (itemId) => this._onItemClick(itemId),
        draggable: true,
      });

      // Immediately reflect the current applied state.
      if (this._appliedItemIds.has(item.id)) {
        thumb.setApplied(true);
      }

      this._thumbnails.set(item.id, thumb);
      fragment.appendChild(thumb.element);
    }

    this._gridEl.appendChild(fragment);

    // Stagger animation for the newly rendered cells
    if (this._options.staggerItems) {
      const els = [...this._thumbnails.values()].map(t => t.element);
      staggerIn(els, 40, 250).catch(() => {});
    }
  }

  /** Destroy all ItemThumbnail instances and clear the grid. */
  _destroyThumbnails() {
    for (const thumb of this._thumbnails.values()) {
      thumb.destroy();
    }
    this._thumbnails.clear();
  }

  // ── Private — UI Helpers ───────────────────────────────────────────────────

  /**
   * Build the "no items" empty-state element for the grid.
   *
   * @returns {HTMLElement}
   */
  _buildEmptyState() {
    return createElement('div', { className: 'item-grid-empty' }, [
      createElement('span', {
        className:   'item-grid-empty-icon',
        textContent: '🧺',
        ariaHidden:  'true',
      }),
      createElement('p', {
        className:   'item-grid-empty-text',
        textContent: 'No items in this category yet!',
      }),
    ]);
  }

  /**
   * Build a grid of loading skeleton cells to show while assets load.
   *
   * @param {number} [count=9] - Number of skeleton cells.
   * @returns {DocumentFragment}
   */
  _buildLoadingGrid(count = 9) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const cell = createElement('div', {
        className: 'item-thumbnail loading',
        ariaHidden: 'true',
      }, [
        createElement('div', { className: 'item-icon' }),
        createElement('span', { className: 'item-name' }),
      ]);
      fragment.appendChild(cell);
    }
    return fragment;
  }

  /**
   * Update the applied items count display in the sidebar footer.
   */
  _updateAppliedCount() {
    if (!this._appliedCountEl) return;
    const count = this._appliedItemIds.size;
    this._appliedCountEl.textContent =
      count === 0
        ? '0 items applied'
        : count === 1
          ? '1 item applied'
          : `${count} items applied`;
  }

  /**
   * Attach the click handler to the sidebar's "Clear All" shortcut button.
   */
  _attachClearButton() {
    if (!this._clearBtnEl) return;
    this._handleClearClick = () => {
      if (typeof this._options.onClearAll === 'function') {
        this._options.onClearAll();
      }
    };
    this._clearBtnEl.addEventListener('click', this._handleClearClick);
  }

  // ── Private — Data Access ──────────────────────────────────────────────────

  /**
   * Return all items from the manifest that belong to `categoryId`,
   * sorted by their `order` property (falling back to insertion order).
   *
   * @param {string} categoryId
   * @returns {Object[]}
   */
  _getItemsForCategory(categoryId) {
    return (this._manifest.items || [])
      .filter(item => item.category === categoryId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  // ── Private — Item Click Handler ───────────────────────────────────────────

  /**
   * Handle a thumbnail click: toggle the applied state optimistically in
   * the UI and notify the parent via the onItemClick callback.
   *
   * The parent is responsible for calling `setAppliedItems()` with the
   * authoritative applied set after processing the click.
   *
   * @param {string} itemId
   */
  _onItemClick(itemId) {
    // Optimistic toggle for immediate feedback
    const thumb = this._thumbnails.get(itemId);
    if (thumb) {
      const willBeApplied = !this._appliedItemIds.has(itemId);
      thumb.setApplied(willBeApplied);

      if (willBeApplied) {
        bounceIn(thumb.element, 300).catch(() => {});
      }
    }

    if (typeof this._options.onItemClick === 'function') {
      this._options.onItemClick(itemId);
    }
  }
}