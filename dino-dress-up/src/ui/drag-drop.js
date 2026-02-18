/**
 * drag-drop.js
 * ──────────────────────────────────────────────────────────────────────────
 * Drag-and-drop handler for clothing items.
 *
 * Allows players to drag ItemThumbnail elements from the clothing panel
 * and drop them onto the WebGPU canvas to apply items at a specific
 * canvas-relative coordinate.
 *
 * Strategy
 * ─────────
 * The handler attaches listeners to the `<canvas>` element (or its wrapper)
 * as the *drop target*.  Draggable items are initiated by the ItemThumbnail
 * component (which sets `draggable="true"` and calls
 * `dataTransfer.setData('application/dino-item-id', itemId)` on dragstart).
 *
 * This module only handles the *canvas-side* of the interaction:
 *   - dragenter / dragover  → show visual feedback on the canvas wrapper
 *   - dragleave             → hide visual feedback
 *   - drop                  → parse the item id, compute canvas-local
 *                             coordinates, invoke onDrop callback
 *
 * Touch support
 * ─────────────
 * Native HTML5 drag-and-drop does not fire on touch devices. A lightweight
 * pointer-events polyfill path is provided here as a fallback — it listens
 * for pointerdown on the item grid and synthesises a ghost element + drop.
 *
 * Usage
 * ─────
 *   const handler = new DragDropHandler(
 *     document.getElementById('canvas-wrapper'),
 *     {
 *       onDrop:      (itemId, x, y) => game.applyItemAtPosition(itemId, x, y),
 *       onDragStart: (itemId)       => console.log('dragging', itemId),
 *       onDragEnd:   ()             => console.log('drag ended'),
 *     }
 *   );
 *
 *   handler.enable();
 *   // … later …
 *   handler.disable();
 *   handler.destroy();
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ─── DragDropHandler Class ────────────────────────────────────────────────────

export class DragDropHandler {
  /**
   * @param {Element} canvasEl - The canvas wrapper element that acts as the
   *   drop target.  This should be the `#canvas-wrapper` div (which wraps
   *   the `<canvas>`) so the rounded border + highlight styling can be toggled
   *   on the wrapper rather than the bare canvas.
   *
   * @param {Object} [options={}]
   * @param {Function} [options.onDrop]
   *   Called when a valid item is dropped.
   *   Signature: `(itemId: string, x: number, y: number) => void`
   *   where `x` / `y` are canvas-local pixel coordinates (0–canvasWidth).
   *
   * @param {Function} [options.onDragStart]
   *   Called when a drag begins over the canvas (dragenter fires).
   *   Signature: `(itemId: string) => void`
   *
   * @param {Function} [options.onDragEnd]
   *   Called when the drag leaves the canvas or ends without a drop.
   *   Signature: `() => void`
   *
   * @param {string} [options.itemDataKey='application/dino-item-id']
   *   The dataTransfer key used by ItemThumbnail.  Change if you use a
   *   different key in the drag-source component.
   */
  constructor(canvasEl, options = {}) {
    if (!canvasEl) {
      throw new Error('DragDropHandler: `canvasEl` element is required.');
    }

    this._el      = canvasEl;
    this._options = {
      itemDataKey: 'application/dino-item-id',
      ...options,
    };

    this._enabled          = false;
    this._currentItemId    = null;   // item id being dragged (from dragenter)
    this._dropHighlightEl  = null;   // #canvas-drop-highlight, if in DOM

    // Touch/pointer fallback state
    this._touchDrag        = null;   // { itemId, ghostEl, startX, startY }

    // ── Bound handlers (needed for removeEventListener) ──
    this._onDragEnter  = this._handleDragEnter.bind(this);
    this._onDragOver   = this._handleDragOver.bind(this);
    this._onDragLeave  = this._handleDragLeave.bind(this);
    this._onDrop       = this._handleDrop.bind(this);

    // Touch / pointer fallback — attached to the item-grid / document
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp   = this._handlePointerUp.bind(this);

    // Cache the drop-highlight element (it may not exist yet in the DOM,
    // so we query lazily in _showHighlight).
    this._dropHighlightEl = document.getElementById('canvas-drop-highlight');
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Attach all drag-and-drop listeners.
   * Safe to call multiple times — listeners are only attached once.
   */
  enable() {
    if (this._enabled) return;
    this._enabled = true;

    this._el.addEventListener('dragenter',  this._onDragEnter,  false);
    this._el.addEventListener('dragover',   this._onDragOver,   false);
    this._el.addEventListener('dragleave',  this._onDragLeave,  false);
    this._el.addEventListener('drop',       this._onDrop,       false);

    // Touch/pointer fallback: listen on the item grid so we can detect
    // long-press + drag gestures on items.
    const grid = document.getElementById('item-grid');
    if (grid) {
      grid.addEventListener('pointerdown', this._onPointerDown, { passive: false });
    }
  }

  /**
   * Detach drag-and-drop listeners without destroying the handler.
   * The handler can be re-enabled via `enable()`.
   */
  disable() {
    if (!this._enabled) return;
    this._enabled = false;

    this._el.removeEventListener('dragenter',  this._onDragEnter);
    this._el.removeEventListener('dragover',   this._onDragOver);
    this._el.removeEventListener('dragleave',  this._onDragLeave);
    this._el.removeEventListener('drop',       this._onDrop);

    const grid = document.getElementById('item-grid');
    if (grid) {
      grid.removeEventListener('pointerdown', this._onPointerDown);
    }

    this._cleanUpTouchDrag();
    this._hideHighlight();
  }

  /**
   * Permanently detach all listeners and release internal references.
   * The instance should not be used after destroy().
   */
  destroy() {
    this.disable();
    this._el      = null;
    this._options = {};
  }

  // ── Private — HTML5 Drag API Handlers ─────────────────────────────────────

  /**
   * dragenter fires when a dragged item first enters the drop target.
   * We read the item id from dataTransfer early so we can show contextual
   * feedback before the drop.
   *
   * @param {DragEvent} e
   */
  _handleDragEnter(e) {
    e.preventDefault();

    // Attempt to read item id.  On some browsers dataTransfer data is not
    // available during dragenter (only during drop), so we fall back to
    // a stored reference.
    const itemId =
      e.dataTransfer.getData(this._options.itemDataKey) ||
      e.dataTransfer.getData('text/plain') ||
      this._currentItemId ||
      null;

    if (itemId) {
      this._currentItemId = itemId;
    }

    e.dataTransfer.dropEffect = 'copy';
    this._showHighlight();
    this._el.classList.add('drag-over');

    if (typeof this._options.onDragStart === 'function' && itemId) {
      this._options.onDragStart(itemId);
    }
  }

  /**
   * dragover fires continuously while a dragged item is over the target.
   * Must call preventDefault() to allow drops.
   *
   * @param {DragEvent} e
   */
  _handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    // No additional work needed — highlight is already showing.
  }

  /**
   * dragleave fires when the dragged item moves outside the drop target.
   * We use `relatedTarget` to ignore internal child-element boundaries.
   *
   * @param {DragEvent} e
   */
  _handleDragLeave(e) {
    // Only hide the highlight when we truly leave the wrapper element.
    if (this._el.contains(e.relatedTarget)) return;

    this._hideHighlight();
    this._el.classList.remove('drag-over');
    this._currentItemId = null;

    if (typeof this._options.onDragEnd === 'function') {
      this._options.onDragEnd();
    }
  }

  /**
   * drop fires when the user releases the drag over the target.
   * Computes canvas-local coordinates and invokes the onDrop callback.
   *
   * @param {DragEvent} e
   */
  _handleDrop(e) {
    e.preventDefault();

    this._hideHighlight();
    this._el.classList.remove('drag-over');

    // Resolve item id from dataTransfer (primary key, then text fallback).
    const itemId =
      e.dataTransfer.getData(this._options.itemDataKey) ||
      e.dataTransfer.getData('text/plain') ||
      this._currentItemId;

    this._currentItemId = null;

    if (!itemId) {
      console.warn('DragDropHandler: drop received but no item id found in dataTransfer.');
      return;
    }

    // Compute canvas-local coordinates.
    const { x, y } = this._clientToCanvasCoords(e.clientX, e.clientY);

    if (typeof this._options.onDrop === 'function') {
      this._options.onDrop(itemId, x, y);
    }

    if (typeof this._options.onDragEnd === 'function') {
      this._options.onDragEnd();
    }
  }

  // ── Private — Touch / Pointer Fallback ────────────────────────────────────
  //
  // This section implements a basic long-press → drag → drop sequence
  // for touch devices where the HTML5 drag API is unavailable.
  //
  // Flow:
  //   pointerdown on item-grid → start 300 ms long-press timer
  //   timer fires → attach pointermove/up listeners, create ghost element
  //   pointermove → move ghost, detect when over canvas
  //   pointerup   → if over canvas, fire onDrop; always clean up

  /** @param {PointerEvent} e */
  _handlePointerDown(e) {
    // Only handle touch/pen input; mouse users use the HTML5 drag API.
    if (e.pointerType === 'mouse') return;

    const thumb = e.target.closest('[data-item-id]');
    if (!thumb) return;

    const itemId = thumb.dataset.itemId;
    if (!itemId) return;

    // Start a long-press timer (300 ms before activating touch-drag).
    const longPressTimer = setTimeout(() => {
      e.target.setPointerCapture?.(e.pointerId);
      this._startTouchDrag(itemId, e.clientX, e.clientY, thumb);
    }, 300);

    // Cancel the timer if the pointer moves significantly before it fires.
    const cancelOnMove = (moveEvt) => {
      const dx = moveEvt.clientX - e.clientX;
      const dy = moveEvt.clientY - e.clientY;
      if (Math.hypot(dx, dy) > 8) {
        clearTimeout(longPressTimer);
        document.removeEventListener('pointermove', cancelOnMove);
        document.removeEventListener('pointerup',   cancelTimer);
      }
    };
    const cancelTimer = () => {
      clearTimeout(longPressTimer);
      document.removeEventListener('pointermove', cancelOnMove);
      document.removeEventListener('pointerup',   cancelTimer);
    };

    document.addEventListener('pointermove', cancelOnMove, { passive: true });
    document.addEventListener('pointerup',   cancelTimer,  { once: true });
  }

  /**
   * Activate the touch drag: create a ghost element and switch to
   * global pointermove/pointerup tracking.
   *
   * @param {string} itemId
   * @param {number} startX
   * @param {number} startY
   * @param {Element} sourceEl - The thumbnail element being dragged.
   */
  _startTouchDrag(itemId, startX, startY, sourceEl) {
    // Build a ghost clone of the thumbnail to follow the finger.
    const ghost = sourceEl.cloneNode(true);
    ghost.style.cssText = `
      position: fixed;
      left: ${startX - 40}px;
      top:  ${startY - 40}px;
      width:  80px;
      height: 80px;
      opacity: 0.85;
      pointer-events: none;
      z-index: 9999;
      transform: scale(1.15) rotate(-5deg);
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(0,0,0,.3);
      transition: none;
    `;
    document.body.appendChild(ghost);

    this._touchDrag = { itemId, ghostEl: ghost };

    document.addEventListener('pointermove', this._onPointerMove, { passive: false });
    document.addEventListener('pointerup',   this._onPointerUp,   { once: true });

    this._showHighlight();
    this._el.classList.add('drag-over');

    if (typeof this._options.onDragStart === 'function') {
      this._options.onDragStart(itemId);
    }
  }

  /** @param {PointerEvent} e */
  _handlePointerMove(e) {
    if (!this._touchDrag) return;
    e.preventDefault();

    const { ghostEl } = this._touchDrag;
    ghostEl.style.left = `${e.clientX - 40}px`;
    ghostEl.style.top  = `${e.clientY - 40}px`;
  }

  /** @param {PointerEvent} e */
  _handlePointerUp(e) {
    if (!this._touchDrag) return;
    document.removeEventListener('pointermove', this._onPointerMove);

    const { itemId } = this._touchDrag;
    this._cleanUpTouchDrag();
    this._hideHighlight();
    this._el.classList.remove('drag-over');

    // Check if the pointer was released over the canvas wrapper.
    const rect = this._el.getBoundingClientRect();
    const overCanvas =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top  &&
      e.clientY <= rect.bottom;

    if (overCanvas) {
      const { x, y } = this._clientToCanvasCoords(e.clientX, e.clientY);
      if (typeof this._options.onDrop === 'function') {
        this._options.onDrop(itemId, x, y);
      }
    }

    if (typeof this._options.onDragEnd === 'function') {
      this._options.onDragEnd();
    }
  }

  /** Clean up the ghost element and touch-drag state. */
  _cleanUpTouchDrag() {
    if (this._touchDrag) {
      if (this._touchDrag.ghostEl?.parentNode) {
        this._touchDrag.ghostEl.parentNode.removeChild(this._touchDrag.ghostEl);
      }
      this._touchDrag = null;
    }
    document.removeEventListener('pointermove', this._onPointerMove);
    // pointerup is once: true so it auto-removes
  }

  // ── Private — Coordinate Helpers ───────────────────────────────────────────

  /**
   * Convert a client-space coordinate (from a mouse/pointer event) to the
   * canvas's local pixel coordinate space.
   *
   * The canvas may be scaled via CSS (e.g. on tablet/mobile where the CSS
   * width is less than the native 800×800 resolution), so we must account
   * for that ratio.
   *
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{ x: number, y: number }} Canvas-local pixel coordinates.
   */
  _clientToCanvasCoords(clientX, clientY) {
    // Find the actual <canvas> element inside the wrapper.
    const canvas = this._el.querySelector('canvas') || this._el;
    const rect   = canvas.getBoundingClientRect();

    // CSS → natural size ratio.
    const scaleX = (canvas.width  || rect.width)  / rect.width;
    const scaleY = (canvas.height || rect.height) / rect.height;

    const x = Math.round((clientX - rect.left) * scaleX);
    const y = Math.round((clientY - rect.top)  * scaleY);

    return { x, y };
  }

  // ── Private — Visual Feedback ──────────────────────────────────────────────

  /**
   * Show the dashed-border drop-highlight ring on the canvas wrapper.
   */
  _showHighlight() {
    // Lazy-resolve in case the element was added to the DOM after construction.
    if (!this._dropHighlightEl) {
      this._dropHighlightEl = document.getElementById('canvas-drop-highlight');
    }
    if (this._dropHighlightEl) {
      this._dropHighlightEl.classList.remove('hidden');
    }
  }

  /**
   * Hide the drop-highlight ring.
   */
  _hideHighlight() {
    if (this._dropHighlightEl) {
      this._dropHighlightEl.classList.add('hidden');
    }
  }
}