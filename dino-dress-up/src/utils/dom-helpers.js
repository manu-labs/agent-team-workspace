/**
 * dom-helpers.js
 * ──────────────────────────────────────────────────────────────────────────
 * Lightweight DOM creation and manipulation utilities.
 *
 * These helpers keep the rest of the UI code free from verbose
 * document.createElement / setAttribute boilerplate, and provide a
 * consistent, readable way to build component trees.
 *
 * All functions are pure utility — no state, no side-effects beyond the
 * DOM operations they explicitly perform.
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ─── Element Creation ────────────────────────────────────────────────────────

/**
 * Create an HTML element with optional attributes and children.
 *
 * @param {string} tag - HTML tag name (e.g. 'div', 'button', 'span').
 * @param {Object} [attrs={}] - Key/value pairs applied via setAttributes().
 *   Special keys:
 *   - `className`  → el.className  (sets the class string directly)
 *   - `textContent`→ el.textContent
 *   - `innerHTML`  → el.innerHTML  (use sparingly, no sanitisation here)
 *   - `style`      → must be an Object; each key maps to el.style[key]
 *   - event keys starting with "on" (e.g. `onClick`) are added as event
 *     listeners using addEventListener (lowercased, "on" stripped).
 *   All other keys are set as HTML attributes via setAttribute().
 * @param {Array<Node|string>} [children=[]] - Child nodes or strings to
 *   append.  Strings become Text nodes.
 * @returns {HTMLElement}
 *
 * @example
 * const btn = createElement('button', {
 *   className: 'btn btn-primary',
 *   textContent: 'Click me',
 *   onClick: () => console.log('clicked'),
 * });
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  setAttributes(el, attrs);

  for (const child of children) {
    if (child == null) continue;                    // skip null / undefined
    if (child instanceof Node) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  }

  return el;
}

/**
 * Create an SVG element in the correct SVG namespace.
 *
 * @param {string} tag - SVG tag name (e.g. 'svg', 'path', 'circle').
 * @param {Object} [attrs={}] - Attribute key/value pairs (set via
 *   setAttribute; no special handling for events or style objects here).
 * @returns {SVGElement}
 *
 * @example
 * const svg = createSVGElement('svg', { viewBox: '0 0 24 24', width: '24', height: '24' });
 * const path = createSVGElement('path', { d: 'M5 12 L12 5 L19 12', stroke: 'currentColor' });
 * svg.appendChild(path);
 */
export function createSVGElement(tag, attrs = {}) {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(SVG_NS, tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value \!= null) {
      el.setAttribute(key, String(value));
    }
  }

  return el;
}

// ─── Attribute / Property Setting ───────────────────────────────────────────

/**
 * Apply a map of attributes / properties to an existing element.
 *
 * Supports the same special keys as createElement():
 *  - `className`   → el.className
 *  - `textContent` → el.textContent
 *  - `innerHTML`   → el.innerHTML
 *  - `style`       → Object merged into el.style
 *  - `on<Event>`   → addEventListener (e.g. onClick → 'click')
 *  - everything else → el.setAttribute(key, value)
 *    A value of `null` or `undefined` removes the attribute.
 *    A value of `true` sets the attribute to '' (boolean attribute).
 *    A value of `false` removes the attribute.
 *
 * @param {Element} el - Target DOM element.
 * @param {Object} attrs - Attribute map.
 * @returns {Element} The same element (for chaining).
 */
export function setAttributes(el, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    // ── Special property mappings ──
    if (key === 'className') {
      el.className = value ?? '';
      continue;
    }

    if (key === 'textContent') {
      el.textContent = value ?? '';
      continue;
    }

    if (key === 'innerHTML') {
      // Only use when the content is known-safe.
      el.innerHTML = value ?? '';
      continue;
    }

    if (key === 'style' && typeof value === 'object' && value \!== null) {
      Object.assign(el.style, value);
      continue;
    }

    // ── Event listeners (onClick → 'click') ──
    if (/^on[A-Z]/.test(key) && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      el.addEventListener(eventName, value);
      continue;
    }

    // ── Standard HTML attributes ──
    if (value === null || value === undefined || value === false) {
      el.removeAttribute(key);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }

  return el;
}

// ─── DOM Manipulation ────────────────────────────────────────────────────────

/**
 * Remove all child nodes from an element.
 *
 * More performant than setting innerHTML = '' for complex subtrees,
 * and avoids leaking event listeners attached to child nodes when those
 * nodes are managed by component instances with their own destroy() paths.
 *
 * @param {Element} el - The element to empty.
 * @returns {Element} The (now empty) element.
 */
export function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  return el;
}

/**
 * Toggle a CSS class on an element, optionally forcing it on or off.
 *
 * A thin wrapper around classList.toggle that accepts the same `force`
 * boolean as the native API, but also returns the element for chaining.
 *
 * @param {Element} el - Target element.
 * @param {string} className - CSS class name to toggle.
 * @param {boolean} [force] - If provided: true → add, false → remove.
 * @returns {Element} The element (for chaining).
 */
export function toggleClass(el, className, force) {
  if (force === undefined) {
    el.classList.toggle(className);
  } else {
    el.classList.toggle(className, force);
  }
  return el;
}

// ─── Query Helpers ───────────────────────────────────────────────────────────

/**
 * Shorthand for querySelector.
 *
 * @param {string} selector - CSS selector.
 * @param {Document|Element} [root=document] - Search root.
 * @returns {Element|null}
 *
 * @example
 * const canvas = $('#dino-canvas');
 */
export function $(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Shorthand for querySelectorAll, returned as a plain Array.
 *
 * @param {string} selector - CSS selector.
 * @param {Document|Element} [root=document] - Search root.
 * @returns {Element[]}
 *
 * @example
 * const tabs = $$('.category-tab');
 */
export function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

// ─── Convenience Builders ────────────────────────────────────────────────────

/**
 * Create a text node (handy for inline insertions).
 *
 * @param {string} text
 * @returns {Text}
 */
export function createText(text) {
  return document.createTextNode(text);
}

/**
 * Append one or more children to a parent element.
 *
 * Strings are automatically converted to Text nodes.
 * Null / undefined values are silently skipped.
 *
 * @param {Element} parent
 * @param {...(Node|string|null|undefined)} children
 * @returns {Element} The parent element.
 */
export function append(parent, ...children) {
  for (const child of children) {
    if (child == null) continue;
    if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }
  return parent;
}

/**
 * Replace an element's entire content with new children.
 *
 * Equivalent to clearChildren() followed by append().
 *
 * @param {Element} parent
 * @param {...(Node|string|null|undefined)} children
 * @returns {Element} The parent element.
 */
export function replaceChildren(parent, ...children) {
  clearChildren(parent);
  return append(parent, ...children);
}

/**
 * Safely remove an element from the DOM if it has a parent.
 *
 * @param {Element|null|undefined} el
 */
export function removeElement(el) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

/**
 * Insert an element immediately before a reference sibling.
 *
 * @param {Element} newEl - Element to insert.
 * @param {Element} refEl - Existing sibling to insert before.
 */
export function insertBefore(newEl, refEl) {
  if (refEl.parentNode) {
    refEl.parentNode.insertBefore(newEl, refEl);
  }
}

/**
 * Insert an element immediately after a reference sibling.
 *
 * @param {Element} newEl - Element to insert.
 * @param {Element} refEl - Existing sibling to insert after.
 */
export function insertAfter(newEl, refEl) {
  if (refEl.parentNode) {
    refEl.parentNode.insertBefore(newEl, refEl.nextSibling);
  }
}

// ─── Data Attributes ─────────────────────────────────────────────────────────

/**
 * Get a data-* attribute value from an element (or its closest ancestor).
 *
 * @param {Element} el
 * @param {string} key - The data key without the "data-" prefix.
 * @param {Element|null} [boundaryEl=null] - Stop traversal at this ancestor.
 * @returns {string|null}
 */
export function getDataAttr(el, key, boundaryEl = null) {
  let node = el;
  while (node && node \!== boundaryEl) {
    const val = node.dataset?.[key];
    if (val \!== undefined) return val;
    node = node.parentElement;
  }
  return null;
}

/**
 * Set multiple data-* attributes at once.
 *
 * @param {Element} el
 * @param {Object} data - Key/value pairs (keys without "data-" prefix).
 * @returns {Element}
 */
export function setDataAttrs(el, data) {
  for (const [key, value] of Object.entries(data)) {
    el.dataset[key] = String(value);
  }
  return el;
}
