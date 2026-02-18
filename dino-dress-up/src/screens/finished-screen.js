/**
 * finished-screen.js - Finished/celebration screen controller
 * Part of the Dino Dress-Up screen system
 *
 * Shows the dressed dinosaur with confetti celebration.
 * Provides Save Image, Dress Again, and New Dino buttons.
 */

import { store } from "../state/store.js";
import { dressAgain, goToSelection } from "../state/actions.js";
import { spawnConfetti } from "../ui/animations.js";

export class FinishedScreen {
  /**
   * @param {HTMLElement} containerEl
   * @param {Object} deps
   * @param {import("../core/renderer.js").Renderer} deps.renderer
   * @param {HTMLCanvasElement} deps.canvas - The main game canvas
   */
  constructor(containerEl, deps) {
    this._container = containerEl;
    this._renderer = deps.renderer;
    this._canvas = deps.canvas;

    this._unsub = null;
    this._confettiSpawned = false;
  }

  /**
   * Initialize the finished screen.
   * Subscribes to screen changes to trigger confetti.
   */
  init() {
    // Wire up buttons
    const saveBtn = this._container.querySelector("#btn-save");
    const dressAgainBtn = this._container.querySelector("#btn-dress-again");
    const newDinoBtn = this._container.querySelector("#btn-new-dino");

    if (saveBtn) {
      saveBtn.addEventListener("click", () => this._saveImage());
    }
    if (dressAgainBtn) {
      dressAgainBtn.addEventListener("click", () => dressAgain());
    }
    if (newDinoBtn) {
      newDinoBtn.addEventListener("click", () => goToSelection());
    }

    // Subscribe to screen changes to trigger confetti
    this._unsub = store.subscribe("currentScreen", (state) => {
      if (state.currentScreen === "finished" && !this._confettiSpawned) {
        this._celebrate();
      } else if (state.currentScreen !== "finished") {
        this._confettiSpawned = false;
      }
    });
  }

  /**
   * Trigger celebration effects.
   */
  _celebrate() {
    this._confettiSpawned = true;

    // Spawn confetti in the confetti layer
    const confettiLayer = document.getElementById("confetti-layer");
    if (confettiLayer) {
      spawnConfetti(confettiLayer, { count: 60, duration: 3000 });
    }
  }

  /**
   * Save the current canvas as a PNG image.
   */
  _saveImage() {
    if (!this._canvas) return;

    try {
      // Force a render to make sure the canvas is up to date
      this._renderer.render(performance.now());

      const dataUrl = this._canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "dino-dress-up.png";
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to save image:", err);
      alert("Could not save image. Try using a screenshot instead!");
    }
  }

  /**
   * Clean up.
   */
  destroy() {
    if (this._unsub) this._unsub();
  }
}
