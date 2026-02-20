/**
 * space-tetris/frontend/src/game/engine.js
 *
 * Pure Tetris game logic — no rendering, no DOM dependencies.
 * Integrates with Zustand gameStore for live stats/status.
 *
 * Usage:
 *   import { createGame } from './engine';
 *   const game = createGame();
 *   game.startGame();
 *   game.move('left');
 *   game.rotate('cw');
 *   game.drop();
 *   const state = game.getState();
 */

import { useGameStore } from '../stores/gameStore';

// ─── Constants ────────────────────────────────────────────────────────────────

export const COLS = 10;
export const ROWS = 20;

/** Color string for each piece type — consumed by the renderer (#66). */
export const COLORS = {
  I: '#00f5ff',
  O: '#ffe600',
  T: '#bf00ff',
  S: '#39ff14',
  Z: '#ff073a',
  J: '#0047ff',
  L: '#ff6a00',
};

// ─── SRS Piece Definitions ────────────────────────────────────────────────────
// Rotation states: four arrays of [dr, dc] offsets from the top-left of the
// piece's bounding box.  States: 0=spawn, 1=90°CW, 2=180°, 3=270°CW.

const PIECES = {
  I: {
    color: COLORS.I,
    rotations: [
      [[1, 0], [1, 1], [1, 2], [1, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 1], [1, 1], [2, 1], [3, 1]],
    ],
  },
  O: {
    color: COLORS.O,
    rotations: [
      [[0, 1], [0, 2], [1, 1], [1, 2]],
      [[0, 1], [0, 2], [1, 1], [1, 2]],
      [[0, 1], [0, 2], [1, 1], [1, 2]],
      [[0, 1], [0, 2], [1, 1], [1, 2]],
    ],
  },
  T: {
    color: COLORS.T,
    rotations: [
      [[0, 1], [1, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 1]],
      [[0, 1], [1, 0], [1, 1], [2, 1]],
    ],
  },
  S: {
    color: COLORS.S,
    rotations: [
      [[0, 1], [0, 2], [1, 0], [1, 1]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 1], [1, 2], [2, 0], [2, 1]],
      [[0, 0], [1, 0], [1, 1], [2, 1]],
    ],
  },
  Z: {
    color: COLORS.Z,
    rotations: [
      [[0, 0], [0, 1], [1, 1], [1, 2]],
      [[0, 2], [1, 1], [1, 2], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[0, 1], [1, 0], [1, 1], [2, 0]],
    ],
  },
  J: {
    color: COLORS.J,
    rotations: [
      [[0, 0], [1, 0], [1, 1], [1, 2]],
      [[0, 1], [0, 2], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 0], [2, 1]],
    ],
  },
  L: {
    color: COLORS.L,
    rotations: [
      [[0, 2], [1, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [1, 2], [2, 0]],
      [[0, 0], [0, 1], [1, 1], [2, 1]],
    ],
  },
};

const PIECE_TYPES = Object.keys(PIECES);

// ─── SRS Wall Kick Tables ─────────────────────────────────────────────────────
// Converted from Tetris wiki (x, y) notation to [dr, dc]:  dr = -y, dc = x.

const KICKS_JLSTZ = {
  '0>>1': [[0, 0], [0, -1], [-1, -1], [2, 0], [2, -1]],
  '1>>0': [[0, 0], [0,  1], [ 1,  1], [-2, 0], [-2, 1]],
  '1>>2': [[0, 0], [0,  1], [ 1,  1], [-2, 0], [-2, 1]],
  '2>>1': [[0, 0], [0, -1], [-1, -1], [2, 0], [2, -1]],
  '2>>3': [[0, 0], [0,  1], [-1,  1], [2, 0], [2,  1]],
  '3>>2': [[0, 0], [0, -1], [ 1, -1], [-2, 0], [-2, -1]],
  '3>>0': [[0, 0], [0, -1], [ 1, -1], [-2, 0], [-2, -1]],
  '0>>3': [[0, 0], [0,  1], [-1,  1], [2, 0], [2,  1]],
};

const KICKS_I = {
  '0>>1': [[0, 0], [0, -2], [0,  1], [ 1, -2], [-2,  1]],
  '1>>0': [[0, 0], [0,  2], [0, -1], [-1,  2], [ 2, -1]],
  '1>>2': [[0, 0], [0, -1], [0,  2], [-2, -1], [ 1,  2]],
  '2>>1': [[0, 0], [0,  1], [0, -2], [ 2,  1], [-1, -2]],
  '2>>3': [[0, 0], [0,  2], [0, -1], [-1,  2], [ 2, -1]],
  '3>>2': [[0, 0], [0, -2], [0,  1], [ 1, -2], [-2,  1]],
  '3>>0': [[0, 0], [0,  1], [0, -2], [ 2,  1], [-1, -2]],
  '0>>3': [[0, 0], [0, -1], [0,  2], [-2, -1], [ 1,  2]],
};

// ─── Scoring ──────────────────────────────────────────────────────────────────

/** Base score for clearing 0–4 lines (multiplied by current level). */
const LINE_SCORES = [0, 100, 300, 500, 800];

/** Gravity interval in ms — decreases with level, minimum 100 ms. */
function tickInterval(level) {
  return Math.max(100, 1000 - (level - 1) * 85);
}

// ─── Board / Piece Helpers ────────────────────────────────────────────────────

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/** Absolute [row, col] positions for a piece at the given origin. */
function getCells(type, rotation, row, col) {
  return PIECES[type].rotations[rotation].map(([dr, dc]) => [row + dr, col + dc]);
}

/**
 * True if all cells are within bounds and don't overlap placed blocks.
 * Cells with row < 0 (spawn buffer above the board) are allowed.
 */
function isValid(board, cells) {
  for (const [r, c] of cells) {
    if (c < 0 || c >= COLS || r >= ROWS) return false;
    if (r >= 0 && board[r][c] !== null) return false;
  }
  return true;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a new Tetris game instance.
 * Call game.startGame() to begin, then wire game.move/rotate/drop/hold to
 * keyboard events in the renderer (#66).
 */
export function createGame() {
  // ── Private state ──────────────────────────────────────────────────────────
  let board = emptyBoard();
  let current = null;        // active piece: { type, rotation, row, col }
  let holdType = null;       // held piece type, or null
  let holdUsed = false;      // one hold per piece placement
  let bag = shuffle(PIECE_TYPES);
  let nextQueue = [];        // next 3 piece types for preview
  let score = 0;
  let level = 1;
  let linesCleared = 0;
  let status = 'idle';       // idle | playing | paused | gameover
  let startTime = null;
  let pauseAccumMs = 0;      // total milliseconds spent paused
  let pauseStartTime = null;
  let rafId = null;
  let lastTickTime = 0;
  let durationInterval = null;

  // ── Bag randomizer ─────────────────────────────────────────────────────────

  function refillBag() {
    bag = shuffle(PIECE_TYPES);
  }

  function drawFromBag() {
    if (bag.length === 0) refillBag();
    return bag.pop();
  }

  function fillNextQueue() {
    while (nextQueue.length < 3) {
      nextQueue.push(drawFromBag());
    }
  }

  // ── Piece management ───────────────────────────────────────────────────────

  /** Create an active piece starting just above the visible board. */
  function makeActive(type) {
    return { type, rotation: 0, row: -1, col: 3 };
  }

  /** Advance the next queue and return a new active piece. */
  function spawnNext() {
    fillNextQueue();
    const type = nextQueue.shift();
    fillNextQueue();
    return makeActive(type);
  }

  /** Row where the current piece would land (for ghost rendering). */
  function calcGhostRow(piece) {
    let r = piece.row;
    while (isValid(board, getCells(piece.type, piece.rotation, r + 1, piece.col))) {
      r++;
    }
    return r;
  }

  // ── Lock & line clear ──────────────────────────────────────────────────────

  /**
   * Stamps the current piece onto the board.
   * Returns false (and triggers game over) if any cell is above row 0.
   */
  function lockCurrent() {
    const cells = getCells(current.type, current.rotation, current.row, current.col);
    if (cells.some(([r]) => r < 0)) {
      triggerGameOver();
      return false;
    }
    for (const [r, c] of cells) {
      board[r][c] = PIECES[current.type].color;
    }
    return true;
  }

  /** Remove full lines and return the count. */
  function clearFullLines() {
    let count = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((cell) => cell !== null)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        count++;
        r++; // re-check index r after rows shift down
      }
    }
    return count;
  }

  // ── Store sync ─────────────────────────────────────────────────────────────

  function syncStats() {
    useGameStore.getState().updateStats({ score, level, linesCleared });
  }

  // ── Duration ───────────────────────────────────────────────────────────────

  function getElapsedMs() {
    if (!startTime) return 0;
    const paused = pauseAccumMs + (pauseStartTime ? performance.now() - pauseStartTime : 0);
    return Math.max(0, performance.now() - startTime - paused);
  }

  // ── Game over ──────────────────────────────────────────────────────────────

  function triggerGameOver() {
    status = 'gameover';
    stopLoop();
    stopDurationTimer();
    useGameStore.getState().setStatus('gameover');
  }

  // ── Piece placement ────────────────────────────────────────────────────────

  /**
   * Lock the current piece, clear lines, update score, spawn next piece.
   * @param {number} dropBonus Extra score from hard/soft drop.
   */
  function placePiece(dropBonus = 0) {
    if (!lockCurrent()) return; // game over already triggered

    const cleared = clearFullLines();
    score += (LINE_SCORES[cleared] || 0) * level + dropBonus;
    linesCleared += cleared;
    level = Math.floor(linesCleared / 10) + 1;
    holdUsed = false;

    current = spawnNext();

    // Game over if the new piece immediately overlaps placed blocks
    if (!isValid(board, getCells(current.type, current.rotation, current.row, current.col))) {
      triggerGameOver();
      return;
    }

    syncStats();
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  function gravityTick() {
    if (!current || status !== 'playing') return;
    const newRow = current.row + 1;
    if (isValid(board, getCells(current.type, current.rotation, newRow, current.col))) {
      current = { ...current, row: newRow };
    } else {
      placePiece();
    }
  }

  function loop(now) {
    if (status !== 'playing') return;
    if (now - lastTickTime >= tickInterval(level)) {
      lastTickTime = now;
      gravityTick();
    }
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    lastTickTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ── Duration timer ─────────────────────────────────────────────────────────

  function startDurationTimer() {
    durationInterval = setInterval(() => {
      if (status === 'playing') {
        useGameStore.getState().updateStats({
          durationSeconds: Math.floor(getElapsedMs() / 1000),
        });
      }
    }, 1000);
  }

  function stopDurationTimer() {
    if (durationInterval !== null) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  return {
    /**
     * Start (or restart) the game.
     * Resets all state, syncs the Zustand store, and begins the game loop.
     */
    startGame() {
      stopLoop();
      stopDurationTimer();

      board = emptyBoard();
      bag = shuffle(PIECE_TYPES);
      nextQueue = [];
      score = 0;
      level = 1;
      linesCleared = 0;
      holdType = null;
      holdUsed = false;
      pauseAccumMs = 0;
      pauseStartTime = null;
      startTime = performance.now();
      status = 'playing';

      fillNextQueue();
      current = spawnNext();

      useGameStore.getState().reset();
      useGameStore.getState().setStatus('playing');

      startLoop();
      startDurationTimer();
    },

    /** Pause — suspends the game loop and accumulates pause time. */
    pauseGame() {
      if (status !== 'playing') return;
      status = 'paused';
      pauseStartTime = performance.now();
      stopLoop();
      useGameStore.getState().setStatus('paused');
    },

    /** Resume from pause. */
    resumeGame() {
      if (status !== 'paused') return;
      if (pauseStartTime !== null) {
        pauseAccumMs += performance.now() - pauseStartTime;
        pauseStartTime = null;
      }
      status = 'playing';
      useGameStore.getState().setStatus('playing');
      startLoop();
    },

    /**
     * Move the active piece one cell in a direction.
     * Moving down acts as a soft drop (1 pt per cell).
     * @param {'left'|'right'|'down'} direction
     */
    move(direction) {
      if (status !== 'playing' || !current) return;
      const dr = direction === 'down' ? 1 : 0;
      const dc = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
      const newRow = current.row + dr;
      const newCol = current.col + dc;

      if (isValid(board, getCells(current.type, current.rotation, newRow, newCol))) {
        current = { ...current, row: newRow, col: newCol };
        if (direction === 'down') {
          score += 1;
          syncStats();
        }
      } else if (direction === 'down') {
        placePiece(); // gravity lock
      }
    },

    /**
     * Rotate the active piece using SRS (with wall kicks).
     * @param {'cw'|'ccw'} direction — default 'cw'
     */
    rotate(direction = 'cw') {
      if (status !== 'playing' || !current) return;
      const from = current.rotation;
      const to = direction === 'cw' ? (from + 1) % 4 : (from + 3) % 4;
      const kicks = current.type === 'I' ? KICKS_I : KICKS_JLSTZ;
      const table = kicks[] || [[0, 0]];

      for (const [dr, dc] of table) {
        const nr = current.row + dr;
        const nc = current.col + dc;
        if (isValid(board, getCells(current.type, to, nr, nc))) {
          current = { ...current, rotation: to, row: nr, col: nc };
          return;
        }
      }
      // No valid kick found — rotation is blocked (silently ignored)
    },

    /**
     * Hard drop: instantly place the piece at its lowest valid position.
     * Awards 2 pts per cell dropped.
     */
    drop() {
      if (status !== 'playing' || !current) return;
      let dropped = 0;
      while (isValid(board, getCells(current.type, current.rotation, current.row + 1, current.col))) {
        current = { ...current, row: current.row + 1 };
        dropped++;
      }
      placePiece(dropped * 2);
    },

    /**
     * Hold the current piece. Only one hold is allowed per piece placement.
     * If the hold slot is empty, the next queued piece becomes active.
     */
    hold() {
      if (status !== 'playing' || !current || holdUsed) return;
      holdUsed = true;
      const incomingType = holdType;
      holdType = current.type;
      current = incomingType === null ? spawnNext() : makeActive(incomingType);

      if (!isValid(board, getCells(current.type, current.rotation, current.row, current.col))) {
        triggerGameOver();
      }
    },

    /**
     * Manually advance gravity by one step.
     * Useful for unit testing without relying on requestAnimationFrame.
     */
    tick() {
      gravityTick();
    },

    /**
     * Returns a complete snapshot of the game state for the renderer.
     * @returns {{
     *   board: Array<Array<string|null>>,
     *   current: {type:string, rotation:number, row:number, col:number}|null,
     *   ghostRow: number|null,
     *   nextPieces: string[],
     *   holdType: string|null,
     *   score: number,
     *   level: number,
     *   linesCleared: number,
     *   status: string,
     *   durationSeconds: number,
     * }}
     */
    getState() {
      return {
        board,
        current,
        ghostRow: current ? calcGhostRow(current) : null,
        nextPieces: [...nextQueue],
        holdType,
        score,
        level,
        linesCleared,
        status,
        durationSeconds: Math.floor(getElapsedMs() / 1000),
      };
    },
  };
}