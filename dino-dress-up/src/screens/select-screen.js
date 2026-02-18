/**
 * select-screen.js - Dinosaur selection screen controller
 *
 * Manages the selection screen where the player picks one of
 * the three dinosaurs to dress up. Renders mini Canvas2D
 * previews of each dino using the SVG path data.
 */

import { store } from "../state/store.js";
import { selectDino } from "../state/actions.js";
import { ASSET_MANIFEST } from "../assets/asset-manifest.js";
import { DINO_PATHS } from "../assets/dino-paths.js";

export class SelectScreen {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container - The selection screen container
   */
  constructor({ container }) {
    this._container = container;
    this._cardGrid = container.querySelector("#dino-card-grid");
    this._cards = [];
  }

  /** Initialize the selection screen. Creates dino preview cards. */
  init() {
    if (\!this._cardGrid) return;

    const dinos = ASSET_MANIFEST.dinosaurs || [
      { id: "trex", name: "Rex", subtitle: "T-Rex" },
      { id: "triceratops", name: "Cera", subtitle: "Triceratops" },
      { id: "stegosaurus", name: "Steggy", subtitle: "Stegosaurus" },
    ];

    for (const dino of dinos) {
      const card = this._createCard(dino);
      this._cardGrid.appendChild(card);
      this._cards.push(card);
    }
  }

  /**
   * Create a dino preview card element.
   * @param {Object} dino - { id, name, subtitle }
   * @returns {HTMLElement}
   */
  _createCard(dino) {
    const card = document.createElement("div");
    card.className = "dino-card";
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Select " + dino.name + " the " + dino.subtitle);
    card.dataset.dinoId = dino.id;

    // Dino preview area
    const preview = document.createElement("div");
    preview.className = "dino-preview";

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    canvas.className = "dino-preview-canvas";
    this._renderMiniPreview(canvas, dino.id);
    preview.appendChild(canvas);

    // Dino info
    const name = document.createElement("h3");
    name.className = "dino-name";
    name.textContent = dino.name;

    const tagline = document.createElement("p");
    tagline.className = "dino-tagline";
    const taglines = {
      trex: "Tiny arms, big style\!",
      triceratops: "Three horns, infinite charm\!",
      stegosaurus: "Plates up, dressed to impress\!",
    };
    tagline.textContent = taglines[dino.id] || dino.subtitle;

    const selectBtn = document.createElement("button");
    selectBtn.className = "btn btn-primary dino-select-btn";
    selectBtn.textContent = "Choose Me\!";

    card.appendChild(preview);
    card.appendChild(name);
    card.appendChild(tagline);
    card.appendChild(selectBtn);

    // Click handler
    const handleSelect = () => selectDino(dino.id);
    card.addEventListener("click", handleSelect);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect();
      }
    });

    return card;
  }

  /**
   * Render a mini preview of the dino using Canvas2D.
   * @param {HTMLCanvasElement} canvas
   * @param {string} dinoId
   */
  _renderMiniPreview(canvas, dinoId) {
    const dinoData = DINO_PATHS[dinoId];
    if (\!dinoData) return;

    const ctx = canvas.getContext("2d");
    if (\!ctx) return;

    const scaleX = canvas.width / dinoData.width;
    const scaleY = canvas.height / dinoData.height;
    const scale = Math.min(scaleX, scaleY) * 0.85;

    const offsetX = (canvas.width - dinoData.width * scale) / 2;
    const offsetY = (canvas.height - dinoData.height * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    for (const pathData of dinoData.paths) {
      ctx.save();

      const path = new Path2D(pathData.d);

      if (pathData.opacity \!== undefined) {
        ctx.globalAlpha = pathData.opacity;
      }

      if (pathData.fill && pathData.fill \!== "none") {
        ctx.fillStyle = pathData.fill;
        ctx.fill(path);
      }

      if (pathData.stroke && pathData.stroke \!== "none") {
        ctx.strokeStyle = pathData.stroke;
        ctx.lineWidth = pathData.strokeWidth || 1;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke(path);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  onEnter() { /* could animate cards in */ }
  onExit() { /* clean up if needed */ }

  destroy() {
    this._cards = [];
    if (this._cardGrid) this._cardGrid.innerHTML = "";
  }
}
