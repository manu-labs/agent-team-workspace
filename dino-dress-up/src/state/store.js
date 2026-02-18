/**
 * store.js - Reactive state store with pub/sub pattern
 * Part of the Dino Dress-Up state management system
 *
 * A minimal, synchronous reactive store inspired by Redux/Zustand.
 * Components subscribe to state changes and are notified whenever
 * the state tree is updated via setState().
 *
 * Design decisions:
 * - Synchronous dispatches (no middleware needed for this app)
 * - Shallow-merge updates (we trade purity for simplicity)
 * - Wildcard "*" subscriptions for global listeners
 * - Per-key subscriptions for targeted re-renders
 */

import { createInitialState } from "./initial-state.js";

export class Store {
  /**
   * @param {Object} [initialState] - Override initial state (for testing)
   */
  constructor(initialState) {
    this._state = initialState || createInitialState();

    /**
     * Subscribers map: key -> Set of callbacks.
     * Special key "*" receives ALL state changes.
     * @type {Map<string, Set<Function>>}
     */
    this._subscribers = new Map();

    /** @type {boolean} Whether we are inside a batch update */
    this._batching = false;

    /** @type {Set<string>} Keys changed during current batch */
    this._batchedKeys = new Set();
  }

  // -- Read --

  /**
   * Get the entire state tree (read-only reference).
   * @returns {Object}
   */
  getState() {
    return this._state;
  }

  /**
   * Get a single state value by key.
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this._state[key];
  }

  // -- Write --

  /**
   * Update the state by shallow-merging a partial state object.
   * Notifies subscribers for each changed key.
   *
   * @param {Object} partial - Partial state to merge
   * @param {string} [source] - Optional label for debugging
   */
  setState(partial, source) {
    const changedKeys = [];

    for (const [key, value] of Object.entries(partial)) {
      if (this._state[key] \!== value) {
        this._state[key] = value;
        changedKeys.push(key);
      }
    }

    if (changedKeys.length === 0) return;

    if (this._batching) {
      changedKeys.forEach((k) => this._batchedKeys.add(k));
    } else {
      this._notify(changedKeys, source);
    }
  }

  /**
   * Batch multiple state updates into a single notification round.
   *
   * @param {Function} fn - Callback that performs multiple setState calls
   */
  batch(fn) {
    this._batching = true;
    this._batchedKeys.clear();

    try {
      fn();
    } finally {
      this._batching = false;
      if (this._batchedKeys.size > 0) {
        this._notify([...this._batchedKeys], "batch");
        this._batchedKeys.clear();
      }
    }
  }

  /**
   * Reset the store to the initial state.
   */
  reset() {
    const allKeys = Object.keys(this._state);
    this._state = createInitialState();
    this._notify(allKeys, "reset");
  }

  // -- Subscribe --

  /**
   * Subscribe to state changes.
   *
   * @param {string|string[]} keys - State key(s) to watch, or "*" for all.
   * @param {Function} callback - Called with (newState, changedKeys, source).
   * @returns {Function} Unsubscribe function
   */
  subscribe(keys, callback) {
    const keyArray = Array.isArray(keys) ? keys : [keys];

    for (const key of keyArray) {
      if (\!this._subscribers.has(key)) {
        this._subscribers.set(key, new Set());
      }
      this._subscribers.get(key).add(callback);
    }

    return () => {
      for (const key of keyArray) {
        const subs = this._subscribers.get(key);
        if (subs) {
          subs.delete(callback);
          if (subs.size === 0) this._subscribers.delete(key);
        }
      }
    };
  }

  // -- Private --

  /**
   * Notify subscribers about state changes.
   * @param {string[]} changedKeys
   * @param {string} [source]
   */
  _notify(changedKeys, source) {
    const state = this._state;
    const notified = new Set();

    for (const key of changedKeys) {
      const subs = this._subscribers.get(key);
      if (subs) {
        for (const cb of subs) {
          if (\!notified.has(cb)) {
            notified.add(cb);
            try {
              cb(state, changedKeys, source);
            } catch (err) {
              console.error("Store subscriber error (key: " + key + "):", err);
            }
          }
        }
      }
    }

    const wildcardSubs = this._subscribers.get("*");
    if (wildcardSubs) {
      for (const cb of wildcardSubs) {
        if (\!notified.has(cb)) {
          notified.add(cb);
          try {
            cb(state, changedKeys, source);
          } catch (err) {
            console.error("Store subscriber error (wildcard):", err);
          }
        }
      }
    }
  }
}

/** The application-wide store singleton. */
export const store = new Store();
