/**
 * math.js - Vector, matrix, and easing utilities for rendering
 * Part of the Dino Dress-Up WebGPU rendering engine
 */

// ─── Vec2 ───────────────────────────────────────────────

export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  add(v) {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v) {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  scale(s) {
    return new Vec2(this.x * s, this.y * s);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const len = this.length();
    if (len === 0) return new Vec2(0, 0);
    return this.scale(1 / len);
  }

  static distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static lerp(a, b, t) {
    return new Vec2(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t
    );
  }
}

// ─── Mat4 (column-major, Float32Array) ─────────────────

export class Mat4 {
  /**
   * Creates a 4x4 identity matrix backed by a Float32Array.
   */
  static identity() {
    const m = new Float32Array(16);
    m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
    return m;
  }

  /**
   * Orthographic projection matrix.
   * Maps (0,0)-(width,height) to NDC (-1,-1)-(1,1) with Y-down.
   */
  static orthographic(width, height) {
    const m = new Float32Array(16);
    m[0]  =  2 / width;
    m[5]  = -2 / height;    // flip Y so (0,0) is top-left
    m[10] =  1;
    m[12] = -1;             // translate origin
    m[13] =  1;
    m[15] =  1;
    return m;
  }

  /**
   * Build a model matrix from position, scale, and rotation.
   * Translation * Rotation * Scale (applied right to left).
   */
  static model(x, y, scaleX, scaleY, rotation = 0) {
    const m = new Float32Array(16);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    m[0]  = cos * scaleX;
    m[1]  = sin * scaleX;
    m[4]  = -sin * scaleY;
    m[5]  = cos * scaleY;
    m[10] = 1;
    m[12] = x;
    m[13] = y;
    m[15] = 1;

    return m;
  }

  /**
   * Multiply two 4x4 matrices (a * b).
   */
  static multiply(a, b) {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        out[col * 4 + row] =
          a[row]      * b[col * 4]     +
          a[4 + row]  * b[col * 4 + 1] +
          a[8 + row]  * b[col * 4 + 2] +
          a[12 + row] * b[col * 4 + 3];
      }
    }
    return out;
  }
}

// ─── Easing Functions ──────────────────────────────────

export const Easing = Object.freeze({
  linear:      (t) => t,
  easeInQuad:  (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutBounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
  },
});

// ─── Helpers ───────────────────────────────────────────

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between a and b.
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Convert degrees to radians.
 */
export function degToRad(deg) {
  return (deg * Math.PI) / 180;
}
