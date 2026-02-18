/**
 * dino-preview-card.js
 * ──────────────────────────────────────────────────────────────────────────
 * Dinosaur selection card component.
 *
 * Displays a large, inviting card for each dinosaur available in the
 * selection screen.  Each card shows:
 *  - A mini canvas (or static SVG fallback) for an animated dino preview
 *  - The dino's name and subtitle
 *  - A short description
 *  - A "Select" call-to-action button
 *
 * When selected the card gains a "selected" CSS class which triggers a
 * green glow animation (defined in style.css) and shows a "✓ Selected"
 * badge via CSS pseudo-element.
 *
 * Usage
 * ─────
 *   const card = new DinoPreviewCard(
 *     {
 *       id:          'trex',
 *       name:        'T-Rex',
 *       subtitle:    'The King of Dinos',
 *       description: 'Fearsome but surprisingly good at accessorising.',
 *       accentColor: '#4caf50',
 *     },
 *     previewCanvasElement,   // optional: a pre-rendered <canvas> element
 *     {
 *       onClick: (dinoId) => game.selectDino(dinoId),
 *     }
 *   );
 *
 *   document.getElementById('dino-card-grid').appendChild(card.element);
 *   card.setSelected(true);
 *   card.destroy();
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

import { createElement, createSVGElement } from '../utils/dom-helpers.js';
import { glowPulse }                       from './animations.js';

// ─── DinoPreviewCard Class ────────────────────────────────────────────────────

export class DinoPreviewCard {
  /**
   * @param {Object} dinoMeta - Dinosaur metadata.
   * @param {string} dinoMeta.id          - Unique dino identifier (e.g. 'trex').
   * @param {string} dinoMeta.name        - Display name (e.g. 'T-Rex').
   * @param {string} [dinoMeta.subtitle]  - Short tagline (e.g. 'The King of Dinos').
   * @param {string} [dinoMeta.description] - Longer description for the card body.
   * @param {string} [dinoMeta.accentColor='#4caf50'] - Card accent colour.
   * @param {string} [dinoMeta.emoji='🦖'] - Emoji shown in the preview area fallback.
   *
   * @param {HTMLCanvasElement|null} [svgCanvasEl=null]
   *   An optional pre-created `<canvas>` element that the WebGPU renderer
   *   will paint the dino preview into.  If `null`, a static SVG placeholder
   *   (dino silhouette) is shown instead.
   *
   * @param {Object} [options={}]
   * @param {Function} [options.onClick] - Called with `(dinoId)` when the card
   *   or its button is clicked.
   */
  constructor(dinoMeta, svgCanvasEl = null, options = {}) {
    if (!dinoMeta || !dinoMeta.id) {
      throw new Error('DinoPreviewCard: `dinoMeta.id` is required.');
    }

    this._meta   = {
      subtitle:     '',
      description:  '',
      accentColor:  '#4caf50',
      emoji:        '🦖',
      ...dinoMeta,
    };
    this._canvas  = svgCanvasEl;  // may be null
    this._options = options;

    this._el       = null;  // root card element
    this._selected = false;

    // Bound handlers
    this._handleClick  = this._onClick.bind(this);
    this._handleKeydown = this._onKeydown.bind(this);

    this._render();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** The root card element. Append to the selection grid. */
  get element() { return this._el; }

  /** The dino id this card represents. */
  get dinoId() { return this._meta.id; }

  /**
   * Mark this card as selected (or deselected).
   *
   * A brief glow pulse plays when transitioning to selected state.
   *
   * @param {boolean} isSelected
   */
  setSelected(isSelected) {
    if (this._selected === isSelected) return;
    this._selected = isSelected;

    this._el.classList.toggle('selected', isSelected);
    this._el.setAttribute('aria-pressed', String(isSelected));

    if (isSelected) {
      glowPulse(this._el, 'rgba(76,175,80,0.55)', 800, 2).catch(() => {});
    }
  }

  /**
   * Replace the canvas element used for the dino preview.
   * Call this after the WebGPU renderer has prepared a canvas for this dino.
   *
   * @param {HTMLCanvasElement} canvasEl
   */
  setCanvas(canvasEl) {
    this._canvas = canvasEl;
    const wrap = this._el?.querySelector('.dino-card-canvas-wrap');
    if (wrap) {
      // Clear existing preview content and insert the live canvas.
      wrap.innerHTML = '';
      wrap.appendChild(canvasEl);
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
   * Build the card DOM tree:
   *
   *  article.dino-preview-card[role=button][aria-pressed][data-dino-id]
   *    └─ div.dino-card-canvas-wrap
   *         └─ canvas (live WebGPU preview) OR svg (static placeholder)
   *    └─ div.dino-card-info
   *         ├─ h2.dino-card-name
   *         ├─ p.dino-card-subtitle
   *         ├─ p.dino-card-description
   *         └─ div.dino-card-cta
   *              └─ button.btn.btn-primary  "Choose [Name]!"
   */
  _render() {
    // ── Preview area ──
    const previewWrap = createElement('div', {
      className:  'dino-card-canvas-wrap',
      ariaHidden: 'true',
    });

    if (this._canvas) {
      previewWrap.appendChild(this._canvas);
    } else {
      // Static SVG placeholder showing a silhouette + emoji
      previewWrap.innerHTML = this._buildPlaceholderHTML();
    }

    // ── Info section ──
    const nameEl = createElement('h2', {
      className:   'dino-card-name',
      textContent: this._meta.name,
    });

    const subtitleEl = createElement('p', {
      className:   'dino-card-subtitle',
      textContent: this._meta.subtitle,
    });

    const descEl = createElement('p', {
      className:   'dino-card-description',
      textContent: this._meta.description,
    });

    // CTA button inside the card (separate from the card-level click)
    const ctaBtn = createElement('button', {
      className: 'btn btn-primary',
      type:      'button',
      textContent: `Choose ${this._meta.name}!`,
      onClick: (e) => {
        e.stopPropagation(); // don't double-fire with card click
        this._onClick();
      },
    });

    const ctaWrap = createElement('div', { className: 'dino-card-cta' }, [ctaBtn]);

    const infoEl = createElement('div', { className: 'dino-card-info' }, [
      nameEl,
      subtitleEl,
      descEl,
      ctaWrap,
    ]);

    // ── Root card element ──
    this._el = createElement('article', {
      className:        'dino-preview-card',
      role:             'button',
      tabindex:         '0',
      'aria-pressed':   'false',
      'aria-label':     `Select ${this._meta.name}: ${this._meta.subtitle || ''}`,
      'data-dino-id':   this._meta.id,
    }, [previewWrap, infoEl]);

    // Subtle left border accent colour
    this._el.style.borderTopColor = this._meta.accentColor;

    // ── Event listeners ──
    this._el.addEventListener('click',   this._handleClick);
    this._el.addEventListener('keydown', this._handleKeydown);
  }

  /**
   * Build the placeholder HTML for the preview area when no live canvas
   * is provided.  Shows the dino emoji centred over a soft gradient
   * background, with a glow ring using the card's accent colour.
   *
   * @returns {string} HTML string.
   */
  _buildPlaceholderHTML() {
    const color  = this._meta.accentColor;
    const emoji  = this._meta.emoji;
    const name   = this._meta.name;

    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        width="180"
        height="180"
        aria-label="${name} dinosaur preview"
        role="img"
      >
        <!-- Background glow circle -->
        <circle
          cx="100" cy="100" r="80"
          fill="${color}"
          opacity="0.12"
        />
        <circle
          cx="100" cy="100" r="64"
          fill="${color}"
          opacity="0.10"
        />

        <!-- Ground line -->
        <ellipse cx="100" cy="162" rx="55" ry="8" fill="${color}" opacity="0.15"/>

        <!-- Dino emoji via foreignObject for emoji rendering -->
        <text
          x="100" y="120"
          text-anchor="middle"
          font-size="80"
          font-family="Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji, sans-serif"
        >${emoji}</text>
      </svg>
    `;
  }

  // ── Private — Event Handlers ───────────────────────────────────────────────

  /** Card click → invoke the onClick callback with this dino's id. */
  _onClick() {
    if (typeof this._options.onClick === 'function') {
      this._options.onClick(this._meta.id);
    }
  }

  /**
   * Keyboard handler: Space / Enter activate the card (same as click).
   *
   * @param {KeyboardEvent} e
   */
  _onKeydown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this._onClick();
    }
  }
}

// ─── Factory: Build All Dino Cards from a Dino Array ─────────────────────────

/**
 * Convenience factory that creates a DinoPreviewCard for each entry in
 * a dinos array and returns them sorted by their `order` property.
 *
 * @param {Object[]} dinos   - Array of dinoMeta objects.
 * @param {Object}   options - Shared options forwarded to each card.
 * @returns {DinoPreviewCard[]}
 */
export function buildDinoCards(dinos, options = {}) {
  return [...dinos]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(meta => new DinoPreviewCard(meta, null, options));
}