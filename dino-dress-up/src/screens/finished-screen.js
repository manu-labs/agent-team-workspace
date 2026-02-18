/**
 * finished-screen.js - Finished screen controller
 *
 * The "admire your creation" screen. Shows the dressed dinosaur
 * with confetti and buttons to save, dress again, or start over.
 */

import { store } from '../state/store.js';
import { dressAgain, startOver } from '../state/actions.js';

export class FinishedScreen {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {import('../core/renderer.js').Renderer} options.renderer
   */
  constructor({ container, renderer }) {
    this._container = container;
    this._renderer = renderer;
    this._confettiTimer = null;
  }

  /** Wire up button event listeners. */
  init() {
    const btnSave = this._container.querySelector('[data-action=save]');
    const btnDressAgain = this._container.querySelector('[data-action=dress-again]');
    const btnNewDino = this._container.querySelector('[data-action=new-dino]');

    if (btnSave) btnSave.addEventListener('click', () => this._saveImage());
    if (btnDressAgain) btnDressAgain.addEventListener('click', () => dressAgain());
    if (btnNewDino) btnNewDino.addEventListener('click', () => startOver());
  }

  /** Save the current canvas as a PNG image download. */
  _saveImage() {
    // Use the source dino-canvas (where the renderer draws)
    const canvas = this._renderer.gpuContext.canvas;
    if (!canvas) return;

    // Force a render to make sure we have the latest frame
    this._renderer.render(performance.now());

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.warn('Could not create image blob');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const state = store.getState();
        const dinoName = state.selectedDino || 'dino';
        link.download = dinoName + '-dressed-up.png';
        link.href = url;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to save image:', err);
      alert('Oops! Could not save the image. Try using a screenshot instead.');
    }
  }

  /**
   * Copy the current dino-canvas frame to the finished-canvas.
   * This gives the finished screen its own static snapshot.
   */
  _copyCanvasSnapshot() {
    const sourceCanvas = this._renderer.gpuContext.canvas;
    const destCanvas = document.getElementById('finished-canvas');
    if (!sourceCanvas || !destCanvas) return;

    // Force a render so the canvas has the latest frame
    this._renderer.render(performance.now());

    const ctx = destCanvas.getContext('2d');
    if (!ctx) return;

    destCanvas.width = sourceCanvas.width;
    destCanvas.height = sourceCanvas.height;
    ctx.drawImage(sourceCanvas, 0, 0);
  }

  /** Spawn CSS confetti burst. */
  _spawnConfetti() {
    // Use the finished screen's own confetti layer
    const layer = document.getElementById('finished-confetti')
      || document.getElementById('confetti-layer');
    if (!layer) return;

    const colors = ['#e84a2a', '#4caf50', '#ffd700', '#4169e1', '#ff69b4', '#9370db'];
    const count = 60;

    for (let i = 0; i < count; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.setProperty('--x', ((Math.random() - 0.5) * 600) + 'px');
      confetti.style.setProperty('--y', (-Math.random() * 400 - 100) + 'px');
      confetti.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      confetti.style.setProperty('--delay', (Math.random() * 0.3) + 's');
      confetti.style.setProperty('--duration', (1 + Math.random() * 1.5) + 's');
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = (40 + Math.random() * 20) + '%';
      confetti.style.top = (30 + Math.random() * 10) + '%';

      layer.appendChild(confetti);
    }

    this._confettiTimer = setTimeout(() => {
      if (layer) layer.innerHTML = '';
    }, 3000);
  }

  onEnter() {
    this._copyCanvasSnapshot();
    this._spawnConfetti();
  }

  onExit() {
    if (this._confettiTimer) {
      clearTimeout(this._confettiTimer);
      this._confettiTimer = null;
    }
    const layer = document.getElementById('finished-confetti');
    if (layer) layer.innerHTML = '';
  }

  destroy() {
    this.onExit();
  }
}
