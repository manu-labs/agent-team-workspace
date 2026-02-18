/**
 * animations.js
 * ──────────────────────────────────────────────────────────────────────────
 * Animation utilities for the Dino Dress-Up UI.
 *
 * Provides:
 *  - bounceIn / glowPulse  — CSS-class-driven animations
 *  - fadeIn / fadeOut      — opacity transitions
 *  - slideUp / slideDown   — translate + opacity transitions
 *  - spawnConfetti         — DOM confetti burst (canvas-relative)
 *
 * All timing functions return a Promise that resolves when the animation
 * ends, so callers can `await` them for sequencing.
 *
 * Design goals
 *  - Zero external dependencies
 *  - Respects prefers-reduced-motion via a single helper
 *  - No side-effects after the returned Promise resolves (clean-up
 *    is performed inside each function)
 * ──────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ─── Motion Preference Guard ─────────────────────────────────────────────────

/**
 * Returns true when the user prefers reduced motion.
 * Used to skip or shorten animations accordingly.
 *
 * @returns {boolean}
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Effective duration: returns 0 if the user prefers reduced motion,
 * otherwise returns the provided duration (ms).
 *
 * @param {number} duration - Desired animation duration in ms.
 * @returns {number}
 */
function effectiveDuration(duration) {
  return prefersReducedMotion() ? 0 : duration;
}

// ─── Shared Promise Helpers ───────────────────────────────────────────────────

/**
 * Wait for `ms` milliseconds.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Listen once for the 'animationend' event on `el`, then resolve.
 * Falls back to a timeout in case the event never fires.
 *
 * @param {Element} el
 * @param {number} timeoutMs - Fallback timeout.
 * @returns {Promise<void>}
 */
function waitForAnimationEnd(el, timeoutMs) {
  return new Promise(resolve => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener('animationend', finish);
      resolve();
    };

    el.addEventListener('animationend', finish, { once: true });
    // Fallback: resolve after timeout + small buffer
    setTimeout(finish, timeoutMs + 50);
  });
}

/**
 * Listen once for the 'transitionend' event on `el`, then resolve.
 * Falls back to a timeout.
 *
 * @param {Element} el
 * @param {number} timeoutMs
 * @returns {Promise<void>}
 */
function waitForTransitionEnd(el, timeoutMs) {
  return new Promise(resolve => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener('transitionend', finish);
      resolve();
    };

    el.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, timeoutMs + 50);
  });
}

// ─── CSS-class-driven Animations ─────────────────────────────────────────────

/**
 * Trigger the `bounceIn` CSS animation on an element by briefly adding
 * the `anim-bounce-in` class (defined in style.css).
 *
 * Useful as a "confirmation" flourish when a clothing item is applied to
 * the dinosaur.
 *
 * @param {Element} el - Target element.
 * @param {number} [duration=300] - Expected animation duration in ms.
 * @returns {Promise<void>} Resolves when the animation completes.
 */
export async function bounceIn(el, duration = 300) {
  const ms = effectiveDuration(duration);
  if (ms === 0) return; // Skip for reduced motion

  // Remove any lingering animation class first so re-triggering works.
  el.classList.remove('anim-bounce-in');

  // Force reflow so removing and re-adding the class restarts the animation.
  void el.offsetWidth;

  el.classList.add('anim-bounce-in');

  await waitForAnimationEnd(el, ms);

  el.classList.remove('anim-bounce-in');
}

/**
 * Pulse a CSS `box-shadow` glow on an element for a fixed number of
 * iterations (default: 2 pulses at 1 s each), then stop.
 *
 * Achieved via the `anim-glow` CSS class + a CSS custom property override
 * `--glow-color` applied inline for the duration.
 *
 * @param {Element} el - Target element.
 * @param {string} [color='rgba(76,175,80,0.6)'] - CSS colour for the glow.
 * @param {number} [duration=1000] - Duration per glow cycle in ms.
 * @param {number} [cycles=2] - Number of glow pulses.
 * @returns {Promise<void>} Resolves after all cycles finish.
 */
export async function glowPulse(el, color = 'rgba(76,175,80,0.6)', duration = 1000, cycles = 2) {
  const ms = effectiveDuration(duration);
  if (ms === 0) return;

  // Inject CSS variable for the colour.
  const prevGlowColor = el.style.getPropertyValue('--glow-color');
  el.style.setProperty('--glow-color', color);

  el.classList.add('anim-glow');

  await delay(ms * cycles);

  el.classList.remove('anim-glow');

  // Restore previous value (or remove the property).
  if (prevGlowColor) {
    el.style.setProperty('--glow-color', prevGlowColor);
  } else {
    el.style.removeProperty('--glow-color');
  }
}

// ─── Fade Animations ─────────────────────────────────────────────────────────

/**
 * Fade an element in from opacity 0 → 1.
 *
 * The element should be visible in the DOM before calling this
 * (hidden via opacity:0 or the `hidden` class removed just before).
 *
 * @param {Element} el - Target element.
 * @param {number} [duration=400] - Transition duration in ms.
 * @returns {Promise<void>}
 */
export async function fadeIn(el, duration = 400) {
  const ms = effectiveDuration(duration);

  // Ensure element is visible but transparent.
  el.style.transition = `opacity ${ms}ms ease`;
  el.style.opacity = '0';
  el.classList.remove('hidden');

  if (ms === 0) {
    el.style.opacity = '1';
    return;
  }

  // Force reflow so the initial opacity:0 is painted before the transition.
  void el.offsetWidth;

  el.style.opacity = '1';

  await waitForTransitionEnd(el, ms);

  // Clean up inline styles.
  el.style.removeProperty('opacity');
  el.style.removeProperty('transition');
}

/**
 * Fade an element out from opacity 1 → 0, then hide it (adds `hidden`).
 *
 * @param {Element} el - Target element.
 * @param {number} [duration=400] - Transition duration in ms.
 * @param {boolean} [hide=true] - Add the `hidden` class when done.
 * @returns {Promise<void>}
 */
export async function fadeOut(el, duration = 400, hide = true) {
  const ms = effectiveDuration(duration);

  el.style.transition = `opacity ${ms}ms ease`;
  el.style.opacity = '1';

  if (ms === 0) {
    el.style.opacity = '0';
    if (hide) el.classList.add('hidden');
    return;
  }

  void el.offsetWidth;

  el.style.opacity = '0';

  await waitForTransitionEnd(el, ms);

  el.style.removeProperty('opacity');
  el.style.removeProperty('transition');

  if (hide) el.classList.add('hidden');
}

// ─── Slide Animations ─────────────────────────────────────────────────────────

/**
 * Slide an element into view from below (translateY up to 0) combined
 * with a fade-in.
 *
 * @param {Element} el - Target element (should already be in the DOM,
 *   visible but possibly off-screen or newly added).
 * @param {number} [duration=400] - Transition duration in ms.
 * @returns {Promise<void>}
 */
export async function slideUp(el, duration = 400) {
  const ms = effectiveDuration(duration);
  const easing = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // spring-y

  el.style.transition = `transform ${ms}ms ${easing}, opacity ${ms}ms ease`;
  el.style.transform = 'translateY(24px)';
  el.style.opacity = '0';
  el.classList.remove('hidden');

  if (ms === 0) {
    el.style.transform = '';
    el.style.opacity = '';
    return;
  }

  void el.offsetWidth;

  el.style.transform = 'translateY(0)';
  el.style.opacity = '1';

  await waitForTransitionEnd(el, ms);

  el.style.removeProperty('transform');
  el.style.removeProperty('opacity');
  el.style.removeProperty('transition');
}

/**
 * Slide an element out upward (translateY from 0 → -24px) combined
 * with a fade-out, then hide it.
 *
 * @param {Element} el - Target element.
 * @param {number} [duration=400] - Transition duration in ms.
 * @param {boolean} [hide=true] - Add the `hidden` class when done.
 * @returns {Promise<void>}
 */
export async function slideDown(el, duration = 400, hide = true) {
  const ms = effectiveDuration(duration);

  el.style.transition = `transform ${ms}ms ease, opacity ${ms}ms ease`;
  el.style.transform = 'translateY(0)';
  el.style.opacity = '1';

  if (ms === 0) {
    if (hide) el.classList.add('hidden');
    return;
  }

  void el.offsetWidth;

  el.style.transform = 'translateY(-24px)';
  el.style.opacity = '0';

  await waitForTransitionEnd(el, ms);

  el.style.removeProperty('transform');
  el.style.removeProperty('opacity');
  el.style.removeProperty('transition');

  if (hide) el.classList.add('hidden');
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

/**
 * Spawn a burst of DOM confetti particles around a point within a container.
 *
 * Particles are absolutely positioned `<div>` elements appended to the
 * `containerEl` (which must have `position: relative` or `absolute`).
 * Each particle self-removes after its fall animation completes.
 *
 * @param {number} x - X position within `containerEl` (px from left).
 * @param {number} y - Y position within `containerEl` (px from top).
 * @param {number} [count=20] - Number of confetti pieces to spawn.
 * @param {Element} [containerEl] - Parent element for the particles.
 *   Defaults to `document.getElementById('confetti-layer')` or `document.body`.
 */
export function spawnConfetti(x, y, count = 20, containerEl = null) {
  if (prefersReducedMotion()) return;

  const container =
    containerEl ||
    document.getElementById('confetti-layer') ||
    document.body;

  const colours = [
    '#ff9800', // orange
    '#4caf50', // green
    '#2196f3', // blue
    '#9c27b0', // purple
    '#e91e63', // pink
    '#ffeb3b', // yellow
    '#00bcd4', // cyan
    '#f44336', // red
  ];

  const shapes = ['circle', 'square', 'rect'];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';

    // Random colour.
    const colour = colours[Math.floor(Math.random() * colours.length)];
    particle.style.background = colour;

    // Random shape.
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    if (shape === 'circle') {
      particle.style.borderRadius = '50%';
    } else if (shape === 'rect') {
      particle.style.width = `${6 + Math.random() * 8}px`;
      particle.style.height = `${3 + Math.random() * 4}px`;
    }

    // Random size (8–14 px).
    const size = 8 + Math.random() * 6;
    if (shape !== 'rect') {
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
    }

    // Random starting offset around (x, y).
    const offsetX = (Math.random() - 0.5) * 60;
    const offsetY = (Math.random() - 0.5) * 40;
    particle.style.left = `${x + offsetX}px`;
    particle.style.top  = `${y + offsetY}px`;

    // Random horizontal drift during fall.
    const driftX = (Math.random() - 0.5) * 120;
    particle.style.setProperty('--drift-x', `${driftX}px`);

    // Random fall duration (0.7 – 1.4 s).
    const fallDuration = 700 + Math.random() * 700;
    particle.style.setProperty('--fall-duration', `${fallDuration}ms`);

    // Random animation delay (stagger).
    const animDelay = Math.random() * 200;
    particle.style.animationDelay = `${animDelay}ms`;

    container.appendChild(particle);

    // Self-remove after animation + delay completes.
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, fallDuration + animDelay + 100);
  }
}

// ─── Screen Transition Helpers ───────────────────────────────────────────────

/**
 * Transition from one screen to another with a cross-fade.
 *
 * Both screens must be in the DOM. `fromScreen` fades out while
 * `toScreen` fades in.
 *
 * @param {Element} fromScreen - Currently visible screen element.
 * @param {Element} toScreen   - Screen to reveal.
 * @param {number}  [duration=400] - Total transition duration in ms.
 * @returns {Promise<void>}
 */
export async function transitionScreens(fromScreen, toScreen, duration = 400) {
  const ms = effectiveDuration(duration);
  const half = ms / 2;

  // Fade out the current screen.
  await fadeOut(fromScreen, half, false);
  fromScreen.classList.add('hidden');

  // Reveal and fade in the next screen.
  toScreen.classList.remove('hidden');
  await fadeIn(toScreen, half);
}

// ─── Utility: Staggered Children Animation ───────────────────────────────────

/**
 * Apply a slide-up + fade animation to a list of child elements with a
 * stagger delay between each.
 *
 * @param {Element[]} elements - Array of elements to animate.
 * @param {number} [stagger=60] - Delay between each element's start (ms).
 * @param {number} [duration=300] - Duration per element (ms).
 * @returns {Promise<void>} Resolves after the last element finishes.
 */
export async function staggerIn(elements, stagger = 60, duration = 300) {
  if (prefersReducedMotion()) return;

  const promises = elements.map((el, i) => {
    return new Promise(resolve => {
      setTimeout(async () => {
        await slideUp(el, duration);
        resolve();
      }, i * stagger);
    });
  });

  await Promise.all(promises);
}