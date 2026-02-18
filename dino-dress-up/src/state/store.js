/**
 * store.js - Reactive state store with pub/sub pattern
 * Part of the Dino Dress-Up state management system
 *
 * A simple, predictable state container inspired by Redux/Zustand.
 * State is updated via dispatched actions and subscribers are notified
 * of changes. Supports selective subscriptions by state key.
 */

import { createInitialState } from "./initial-state.js";

class Store {
  constructor() {
    /** @type {import("./initial-state.js").AppState} */
    this._state = createInitialState();

    /** @type {Map<string, Set<Function>>} - Key-specific subscribers */
    this._subscribers = new Map();

    /** @type {Set<Function>} - Global subscribers (notified on any change) */
    this._globalSubscribers = new Set();

    /** @type {boolean} - Batching flag to coalesce notifications */
    this._isBatching = false;

    /** @type {Set<string>} - Keys changed during a batch */
    this._pendingKeys = new Set();
  }

  /**
   * Get the current state (read-only snapshot).
   * @returns {import("./initial-state.js").AppState}
   */
  getState() {
    return this._state;
  }

  /**
   * Get a specific value from state.
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this._state[key];
  }

  /**
   * Update one or more state properties and notify subscribers.
   *
   * @param {Partial<import("./initial-state.js").AppState>} updates
   *   An object with the keys to update and their new values.
   *
   * @example
   *   store.set({ selectedDino: "trex", currentScreen: "dressing" });
   */
  set(updates) {
    const changedKeys = [];

    for (const [key, value] of Object.entries(updates)) {
      if (this._state[key] \!== value) {
        this._state[key] = value;
        changedKeys.push(key);
      }
    }

    if (changedKeys.length === 0) return;

    if (this._isBatching) {
      changedKeys.forEach((k) => this._pendingKeys.add(k));
    } else {
      this._notify(changedKeys);
    }
  }

  /**
   * Batch multiple state updates into a single notification cycle.
   * Subscribers are only notified once after the callback completes.
   *
   * @param {Function} callback - A function that calls store.set() one or more times.
   *
   * @example
   *   store.batch(() => {
   *     store.set({ selectedDino: "trex" });
   *     store.set({ currentScreen: "dressing" });
   *     store.set({ activeCategory: "hats" });
   *   });
   *   // Subscribers notified once with all 3 changes
   */
  batch(callback) {
    this._isBatching = true;
    try {
      callback();
    } finally {
      this._isBatching = false;
      if (this._pendingKeys.size > 0) {
        const keys = [...this._pendingKeys];
        this._pendingKeys.clear();
        this._notify(keys);
      }
    }
  }

  /**
   * Subscribe to changes on specific state keys.
   *
   * @param {string|string[]} keys - State key(s) to watch.
   * @param {Function} callback - Called with (newState, changedKeys) when any watched key changes.
   * @returns {Function} Unsubscribe function.
   *
   * @example
   *   const unsub = store.subscribe("appliedClothing", (state) => {
   *     console.log("Clothing changed:", state.appliedClothing);
   *   });
   *   // Later: unsub();
   */
  subscribe(keys, callback) {
    const keyArray = Array.isArray(keys) ? keys : [keys];

    for (const key of keyArray) {
      if (\!this._subscribers.has(key)) {
        this._subscribers.set(key, new Set());
      }
      this._subscribers.get(key).add(callback);
    }

    // Return unsubscribe function
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

  /**
   * Subscribe to ALL state changes (global listener).
   *
   * @param {Function} callback - Called with (newState, changedKeys) on any change.
   * @returns {Function} Unsubscribe function.
   */
  subscribeAll(callback) {
    this._globalSubscribers.add(callback);
    return () => this._globalSubscribers.delete(callback);
  }

  /**
   * Notify subscribers about changed keys.
   * @param {string[]} changedKeys
   */
  _notify(changedKeys) {
    const notified = new Set();

    // Notify key-specific subscribers
    for (const key of changedKeys) {
      const subs = this._subscribers.get(key);
      if (subs) {
        for (const callback of subs) {
          if (\!notified.has(callback)) {
            notified.add(callback);
            try {
              callback(this._state, changedKeys);
            } catch (err) {
              console.error(`Store subscriber error (key: ${key}):`, err);
            }
          }
        }
      }
    }

    // Notify global subscribers
    for (const callback of this._globalSubscribers) {
      if (\!notified.has(callback)) {
        try {
          callback(this._state, changedKeys);
        } catch (err) {
          console.error("Store global subscriber error:", err);
        }
      }
    }
  }

  /**
   * Reset the store to its initial state.
   * Notifies all subscribers.
   */
  reset() {
    this._state = createInitialState();
    const allKeys = Object.keys(this._state);
    this._notify(allKeys);
  }

  /**
   * Get subscriber count (useful for debugging).
   * @returns {{ keySubscribers: number, globalSubscribers: number }}
   */
  get subscriberCount() {
    let keyCount = 0;
    this._subscribers.forEach((subs) => (keyCount += subs.size));
    return {
      keySubscribers: keyCount,
      globalSubscribers: this._globalSubscribers.size,
    };
  }
}

// Singleton store instance
export const store = new Store();
