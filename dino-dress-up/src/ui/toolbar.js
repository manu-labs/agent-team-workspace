/**
 * toolbar.js
 * ──────────────────────────────────────────────────────────────────────────
 * Top toolbar component for the dressing room screen.
 *
 * Contains:
 *  - Back button  → returns to dino selection screen
 *  - Dino name display
 *  - Applied items count badge
 *  - Clear All button → removes every clothing item
 *  - Randomize button → picks a random outfit
 *  - Done button → finishes dressing and triggers a celebration
 *
 * The toolbar does not manage any game state.  All interactions are
 * communicated outward via the callbacks supplied in `options`.
 *
 * Usage
 * ─────
 *   const toolbar = new Toolbar(
 *     document.getElementById('toolbar'),
 *     {
 *       onBack:       () => game.showSelectionScreen(),
 *       onClearAll:   () => game.clearAllItems(),
 *       onRandomize:  () => game.randomiseOutfit(),
 *       onDone:       () => game.finishDressing(),
 *     }
 *   );
 *
 *   toolbar.setDinoName('T-Rex');
 *   toolbar.setAppliedCount(3);
 *   toolbar.destroy();
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

import { createElement, clearChildren } from './dom-helpers.js';
import { bounceIn }                     from './animations.js';

// ─── Toolbar Class ────────────────────────────────────────────────────────────

export class Toolbar {
  /**
   * @param {Element} container - The toolbar container element (e.g. `#toolbar`).
   *   The component clears and re-renders this element completely.
   *
   * @param {Object} [options={}]
   * @param {Function} [options.onBack]      - Called when Back is clicked.
   * @param {Function} [options.onClearAll]  - Called when Clear All is clicked.
   * @param {Function} [options.onRandomize] - Called when Randomize is clicked.
   * @param {Function} [options.onDone]      - Called when Done is clicked.
   * @param {string}   [options.dinoName=''] - Initial dino name to display.
   */
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('Toolbar: `container` element is required.');
    }

    this._container = container;
    this._options   = options;

    // Internal state
    this._dinoName     = options.dinoName || '';
    this._appliedCount = 0;

    // DOM references (populated by _render())
    this._nameEl       = null;
    this._countBadgeEl = null;
    this._clearBtn     = null;
    this._randomizeBtn = null;
    this._doneBtn      = null;
    this._backBtn      = null;

    this._render();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Update the dino name shown in the toolbar centre.
   *
   * @param {string} name - Display name (e.g. 'T-Rex').
   */
  setDinoName(name) {
    this._dinoName = name;
    if (this._nameEl) {
      this._nameEl.textContent = name;
    }
    // Also sync to the global stats bar (#stat-dino-name) if present.
    const statName = document.getElementById('stat-dino-name');
    if (statName) statName.textContent = name;
  }

  /**
   * Update the applied item count badge.
   *
   * The badge text animates with a quick bounce when the count changes.
   *
   * @param {number} count - Total number of clothing items currently applied.
   */
  setAppliedCount(count) {
    if (this._appliedCount === count) return;
    const prev = this._appliedCount;
    this._appliedCount = count;

    if (this._countBadgeEl) {
      this._countBadgeEl.textContent = count === 0
        ? 'No items'
        : count === 1
          ? '1 item'
          : `${count} items`;

      if (count !== prev) {
        bounceIn(this._countBadgeEl, 250).catch(() => {});
      }
    }

    // Sync to the canvas stats bar if it exists.
    const statCount = document.getElementById('stat-item-count');
    if (statCount) {
      statCount.textContent = count === 0
        ? '0 items worn'
        : count === 1
          ? '1 item worn'
          : `${count} items worn`;
    }
  }

  /**
   * Enable or disable the randomise button.
   * Useful while a randomise operation is in progress.
   *
   * @param {boolean} enabled
   */
  setRandomizeEnabled(enabled) {
    if (this._randomizeBtn) {
      this._randomizeBtn.disabled = !enabled;
    }
  }

  /**
   * Enable or disable the Done button.
   *
   * @param {boolean} enabled
   */
  setDoneEnabled(enabled) {
    if (this._doneBtn) {
      this._doneBtn.disabled = !enabled;
    }
  }

  /**
   * Remove all event listeners and clear the container DOM.
   * Call this before destroying the dressing screen.
   */
  destroy() {
    // Event listeners were added via createElement's onClick shorthand
    // (which uses addEventListener internally).  Since we replace the entire
    // DOM on destroy, we just clear the container.
    clearChildren(this._container);
    this._nameEl       = null;
    this._countBadgeEl = null;
    this._clearBtn     = null;
    this._randomizeBtn = null;
    this._doneBtn      = null;
    this._backBtn      = null;
  }

  // ── Private — Rendering ────────────────────────────────────────────────────

  /**
   * Build and inject the full toolbar DOM into `this._container`.
   *
   * Layout:
   *   [← Back]   [🦖 T-Rex · 3 items]  [Clear All] [🎲 Randomize] [✓ Done!]
   */
  _render() {
    clearChildren(this._container);

    // ── Back button ──
    this._backBtn = createElement('button', {
      className:   'btn btn-ghost toolbar-back-btn',
      type:        'button',
      'aria-label': 'Back to dinosaur selection',
      onClick:     () => this._handleBack(),
    }, [
      this._buildIcon('←'),
      createElement('span', {
        className:   'toolbar-btn-label',
        textContent: 'Back',
      }),
    ]);

    // ── Dino name ──
    this._nameEl = createElement('span', {
      className:   'toolbar-dino-name',
      textContent: this._dinoName,
      'aria-live': 'polite',
    });

    // ── Applied count badge ──
    this._countBadgeEl = createElement('span', {
      className:   'toolbar-item-count',
      textContent: 'No items',
      'aria-live': 'polite',
      'aria-label': 'Applied clothing items count',
    });

    // ── Centre group (name + count) ──
    const centreGroup = createElement('div', {
      className: 'toolbar-centre-group',
      style: {
        display:    'flex',
        alignItems: 'center',
        gap:        '10px',
        marginRight: 'auto',
        marginLeft: '8px',
      },
    }, [this._nameEl, this._countBadgeEl]);

    // ── Action buttons ──
    this._clearBtn = createElement('button', {
      className:   'btn btn-ghost btn-sm toolbar-btn-clear',
      type:        'button',
      'aria-label': 'Clear all clothing items from the dinosaur',
      onClick:     () => this._handleClearAll(),
    }, [
      this._buildIcon('🗑'),
      createElement('span', {
        className:   'toolbar-btn-label',
        textContent: 'Clear All',
      }),
    ]);

    this._randomizeBtn = createElement('button', {
      className:   'btn btn-accent btn-sm toolbar-btn-randomize',
      type:        'button',
      'aria-label': 'Randomize the dinosaur outfit',
      onClick:     () => this._handleRandomize(),
    }, [
      this._buildIcon('🎲'),
      createElement('span', {
        className:   'toolbar-btn-label',
        textContent: 'Randomize',
      }),
    ]);

    this._doneBtn = createElement('button', {
      className:   'btn btn-primary toolbar-btn-done',
      type:        'button',
      'aria-label': 'Finish dressing and celebrate!',
      onClick:     () => this._handleDone(),
    }, [
      this._buildIcon('✓'),
      createElement('span', {
        className:   'toolbar-btn-label',
        textContent: 'Done!',
      }),
    ]);

    // ── Button group ──
    const btnGroup = createElement('div', { className: 'toolbar-btn-group' }, [
      this._clearBtn,
      this._randomizeBtn,
      this._doneBtn,
    ]);

    // ── Assemble toolbar ──
    this._container.appendChild(this._backBtn);
    this._container.appendChild(centreGroup);
    this._container.appendChild(btnGroup);
  }

  /**
   * Build a simple inline icon span.
   *
   * @param {string} iconChar - Emoji or character to display as the icon.
   * @returns {HTMLElement}
   */
  _buildIcon(iconChar) {
    return createElement('span', {
      className:   'toolbar-btn-icon',
      textContent: iconChar,
      ariaHidden:  'true',
    });
  }

  // ── Private — Action Handlers ──────────────────────────────────────────────

  /** Invoke the `onBack` callback with a brief button animation. */
  _handleBack() {
    if (this._backBtn) bounceIn(this._backBtn, 200).catch(() => {});
    if (typeof this._options.onBack === 'function') {
      this._options.onBack();
    }
  }

  /** Invoke the `onClearAll` callback. */
  _handleClearAll() {
    if (this._clearBtn) bounceIn(this._clearBtn, 200).catch(() => {});
    if (typeof this._options.onClearAll === 'function') {
      this._options.onClearAll();
    }
  }

  /**
   * Invoke the `onRandomize` callback.
   * Briefly disables the button while the operation runs to prevent
   * spamming (re-enabled after 600 ms — the parent may also call
   * `setRandomizeEnabled(true)` when the operation truly completes).
   */
  _handleRandomize() {
    if (this._randomizeBtn) {
      this._randomizeBtn.disabled = true;
      bounceIn(this._randomizeBtn, 250).catch(() => {});
      setTimeout(() => {
        if (this._randomizeBtn) this._randomizeBtn.disabled = false;
      }, 600);
    }
    if (typeof this._options.onRandomize === 'function') {
      this._options.onRandomize();
    }
  }

  /** Invoke the `onDone` callback with a celebratory button animation. */
  _handleDone() {
    if (this._doneBtn) bounceIn(this._doneBtn, 300).catch(() => {});
    if (typeof this._options.onDone === 'function') {
      this._options.onDone();
    }
  }
}