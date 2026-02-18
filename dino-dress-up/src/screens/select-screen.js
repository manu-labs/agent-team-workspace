/**
 * select-screen.js - Dino selection screen controller
 * Part of the Dino Dress-Up screen system
 *
 * Manages the dino selection screen: creates preview cards for
 * each dinosaur and handles selection events.
 */

import { store } from "../state/store.js";
import { selectDino } from "../state/actions.js";
import { ASSET_MANIFEST } from "../assets/asset-manifest.js";
import { DINO_PATHS } from "../assets/dino-paths.js";
import { DinoPreviewCard } from "../ui/dino-preview-card.js";

export class SelectScreen {
  /**
   * @param {HTMLElement} containerEl - The selection screen root element
   * @param {Object} [options]
   * @param {import("../core/texture-manager.js").TextureManager} [options.textureManager]
   */
  constructor(containerEl, options = {}) {
    this._container = containerEl;
    this._options = options;
    this._cards = [];
    this._gridEl = containerEl.querySelector("#dino-card-grid");
  }

  /**
   * Initialize the selection screen — create dino preview cards.
   */
  init() {
    if (\!this._gridEl) return;

    const dinos = ASSET_MANIFEST.dinosaurs;

    for (const dino of dinos) {
      const dinoData = DINO_PATHS[dino.id];
      if (\!dinoData) continue;

      const card = new DinoPreviewCard(dino.id, {
        name: dinoData.name || dino.name,
        subtitle: dinoData.subtitle || dino.subtitle,
        description: this._getDescription(dino.id),
        dinoPaths: dinoData,
        textureManager: this._options.textureManager,
        onSelect: (dinoId) => selectDino(dinoId),
      });

      this._cards.push(card);
      this._gridEl.appendChild(card.element);
    }
  }

  /**
   * Get a fun description for each dino.
   * @param {string} dinoId
   * @returns {string}
   */
  _getDescription(dinoId) {
    const descriptions = {
      trex: "Tiny arms, big style\! Rex is ready to be the most fashionable predator around.",
      triceratops: "Three horns, infinite charm\! Cera loves a good hat on her frill.",
      stegosaurus: "Plates up, dressed to impress\! Steggy is the chillest fashionista.",
    };
    return descriptions[dinoId] || "A fashionable dinosaur\!";
  }

  /**
   * Clean up cards and event listeners.
   */
  destroy() {
    for (const card of this._cards) {
      card.destroy();
    }
    this._cards = [];
  }
}
