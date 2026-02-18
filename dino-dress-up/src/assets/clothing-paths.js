// clothing-paths.js

export const CLOTHING_PATHS = {

  // ─────────────────────────────────────────────────────────────
  // HATS (width:140, height:120 each)
  // ─────────────────────────────────────────────────────────────

  'top-hat': {
    name: 'Top Hat',
    width: 140,
    height: 120,
    paths: [
      // Brim shadow
      { d: 'M 10 98 C 10 92 30 88 70 88 C 110 88 130 92 130 98 C 130 104 110 108 70 108 C 30 108 10 104 10 98 Z', fill: '#111111' },
      // Brim top face
      { d: 'M 14 92 C 14 87 32 83 70 83 C 108 83 126 87 126 92 C 126 97 108 101 70 101 C 32 101 14 97 14 92 Z', fill: '#222222' },
      // Crown body
      { d: 'M 32 88 L 32 28 C 32 24 48 20 70 20 C 92 20 108 24 108 28 L 108 88 Z', fill: '#1a1a1a' },
      // Crown top ellipse
      { d: 'M 32 28 C 32 22 48 17 70 17 C 92 17 108 22 108 28 C 108 34 92 39 70 39 C 48 39 32 34 32 28 Z', fill: '#2a2a2a' },
      // Gold band
      { d: 'M 32 72 L 32 80 L 108 80 L 108 72 Z', fill: '#c8a820' },
      // Band highlight
      { d: 'M 32 72 L 32 75 L 108 75 L 108 72 Z', fill: '#e0b830' },
      // Crown left edge shadow
      { d: 'M 32 28 L 32 88 L 40 88 L 40 28 Z', fill: '#111111' },
      // Crown right edge shadow
      { d: 'M 100 28 L 100 88 L 108 88 L 108 28 Z', fill: '#111111' },
    ],
  },

  'cowboy-hat': {
    name: 'Cowboy Hat',
    width: 140,
    height: 120,
    paths: [
      // Wide brim shadow underside
      { d: 'M 2 82 C 2 74 28 68 70 68 C 112 68 138 74 138 82 C 138 90 112 96 70 96 C 28 96 2 90 2 82 Z', fill: '#6B3410' },
      // Brim top surface
      { d: 'M 6 76 C 6 69 30 63 70 63 C 110 63 134 69 134 76 C 134 83 110 89 70 89 C 30 89 6 83 6 76 Z', fill: '#8B4513' },
      // Crown base
      { d: 'M 34 72 C 30 72 28 70 28 68 L 30 40 C 30 36 46 32 70 32 C 94 32 110 36 110 40 L 112 68 C 112 70 110 72 106 72 Z', fill: '#7a3c10' },
      // Crown body main
      { d: 'M 36 70 L 34 42 C 34 38 50 34 70 34 C 90 34 106 38 106 42 L 104 70 Z', fill: '#8B4513' },
      // Crown top curve (pinch)
      { d: 'M 34 42 C 34 36 50 30 70 30 C 90 30 106 36 106 42 C 106 48 90 52 70 52 C 50 52 34 48 34 42 Z', fill: '#9B5523' },
      // Center crease dip
      { d: 'M 55 36 C 60 32 70 30 80 32 C 75 34 70 36 65 34 C 62 33 58 34 55 36 Z', fill: '#6B3410' },
      // Hat band
      { d: 'M 36 60 L 36 66 L 104 66 L 104 60 Z', fill: '#5C3317' },
      // Band buckle detail
      { d: 'M 64 60 L 64 66 L 76 66 L 76 60 Z', fill: '#c8a820' },
      // Brim left curl up
      { d: 'M 6 76 C 10 68 20 64 34 63 C 28 66 20 70 14 76 Z', fill: '#7a3c10' },
      // Brim right curl up
      { d: 'M 134 76 C 130 68 120 64 106 63 C 112 66 120 70 126 76 Z', fill: '#7a3c10' },
    ],
  },

  'crown': {
    name: 'Crown',
    width: 140,
    height: 120,
    paths: [
      // Crown base band
      { d: 'M 10 90 L 10 70 L 130 70 L 130 90 C 130 96 110 100 70 100 C 30 100 10 96 10 90 Z', fill: '#B8960C' },
      // Crown base band top
      { d: 'M 10 70 C 10 65 30 62 70 62 C 110 62 130 65 130 70 C 130 75 110 78 70 78 C 30 78 10 75 10 70 Z', fill: '#FFD700' },
      // Left point (outer)
      { d: 'M 10 70 L 22 30 L 34 70 Z', fill: '#FFD700' },
      // Second point from left
      { d: 'M 34 70 L 46 20 L 58 70 Z', fill: '#FFD700' },
      // Center point (tallest)
      { d: 'M 55 70 L 70 8 L 85 70 Z', fill: '#FFD700' },
      // Second point from right
      { d: 'M 82 70 L 94 20 L 106 70 Z', fill: '#FFD700' },
      // Right point (outer)
      { d: 'M 106 70 L 118 30 L 130 70 Z', fill: '#FFD700' },
      // Shadow on left faces of points
      { d: 'M 10 70 L 22 30 L 28 50 L 16 70 Z', fill: '#B8960C' },
      { d: 'M 34 70 L 46 20 L 52 44 L 40 70 Z', fill: '#B8960C' },
      { d: 'M 55 70 L 70 8 L 77 38 L 62 70 Z', fill: '#B8960C' },
      { d: 'M 82 70 L 94 20 L 100 44 L 88 70 Z', fill: '#B8960C' },
      { d: 'M 106 70 L 118 30 L 124 50 L 112 70 Z', fill: '#B8960C' },
      // Center jewel (red ruby)
      { d: 'M 62 82 C 62 76 66 72 70 72 C 74 72 78 76 78 82 C 78 88 74 92 70 92 C 66 92 62 88 62 82 Z', fill: '#DC143C' },
      // Center jewel highlight
      { d: 'M 65 77 C 66 75 68 74 70 74 C 69 75 67 77 65 77 Z', fill: '#ff6080' },
      // Left side jewel (blue sapphire)
      { d: 'M 24 80 C 24 76 27 73 30 73 C 33 73 36 76 36 80 C 36 84 33 87 30 87 C 27 87 24 84 24 80 Z', fill: '#1E90FF' },
      { d: 'M 26 77 C 27 76 28 75 30 75 C 29 76 27 77 26 77 Z', fill: '#80c0ff' },
      // Right side jewel (blue sapphire)
      { d: 'M 104 80 C 104 76 107 73 110 73 C 113 73 116 76 116 80 C 116 84 113 87 110 87 C 107 87 104 84 104 80 Z', fill: '#1E90FF' },
      { d: 'M 106 77 C 107 76 108 75 110 75 C 109 76 107 77 106 77 Z', fill: '#80c0ff' },
      // Band trim line
      { d: 'M 10 78 L 130 78', fill: 'none', stroke: '#B8960C', strokeWidth: 1.5 },
    ],
  },

  'beanie': {
    name: 'Beanie',
    width: 140,
    height: 120,
    paths: [
      // Main dome body
      { d: 'M 20 80 C 20 46 40 16 70 14 C 100 16 120 46 120 80 Z', fill: '#CC2200' },
      // Dome stripes (white horizontal bands)
      { d: 'M 22 68 C 24 62 38 58 70 58 C 102 58 116 62 118 68 L 118 72 C 116 66 102 62 70 62 C 38 62 24 66 22 72 Z', fill: '#ffffff' },
      { d: 'M 26 50 C 30 44 46 40 70 40 C 94 40 110 44 114 50 L 114 54 C 110 48 94 44 70 44 C 46 44 30 48 26 54 Z', fill: '#ffffff' },
      { d: 'M 36 34 C 42 28 54 24 70 24 C 86 24 98 28 104 34 L 102 38 C 96 32 84 28 70 28 C 56 28 44 32 38 38 Z', fill: '#ffffff' },
      // Ribbed brim band
      { d: 'M 18 80 L 18 92 C 18 96 40 100 70 100 C 100 100 122 96 122 92 L 122 80 Z', fill: '#AA1800' },
      // Brim ribbing lines
      { d: 'M 26 80 L 26 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 34 80 L 34 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 42 80 L 42 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 50 80 L 50 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 58 80 L 58 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 66 80 L 66 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 74 80 L 74 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 82 80 L 82 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 90 80 L 90 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 98 80 L 98 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 106 80 L 106 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      { d: 'M 114 80 L 114 100', fill: 'none', stroke: '#CC2200', strokeWidth: 2 },
      // Pompom base
      { d: 'M 58 18 C 58 10 63 6 70 6 C 77 6 82 10 82 18 C 82 24 77 28 70 28 C 63 28 58 24 58 18 Z', fill: '#CC2200' },
      // Pompom fluffy texture
      { d: 'M 60 14 C 62 10 66 8 70 8 C 68 9 65 11 63 13 Z', fill: '#EE3311' },
      { d: 'M 80 14 C 78 10 74 8 70 8 C 72 9 75 11 77 13 Z', fill: '#EE3311' },
      { d: 'M 62 22 C 61 18 62 14 64 12 C 63 15 63 19 64 22 Z', fill: '#EE3311' },
      { d: 'M 78 22 C 79 18 78 14 76 12 C 77 15 77 19 76 22 Z', fill: '#EE3311' },
    ],
  },

  'propeller-cap': {
    name: 'Propeller Cap',
    width: 140,
    height: 120,
    paths: [
      // Cap dome
      { d: 'M 24 76 C 24 46 42 22 70 20 C 98 22 116 46 116 76 Z', fill: '#4169E1' },
      // Cap dome highlight
      { d: 'M 40 50 C 44 36 54 26 68 22 C 58 28 50 38 46 50 Z', fill: '#6080FF' },
      // Brim visor
      { d: 'M 16 76 C 16 72 38 68 70 68 C 102 68 124 72 124 76 C 124 80 102 84 70 84 C 38 84 16 80 16 76 Z', fill: '#333333' },
      // Brim top rim
      { d: 'M 20 74 C 20 70 40 67 70 67 C 100 67 120 70 120 74 C 120 78 100 81 70 81 C 40 81 20 78 20 74 Z', fill: '#444444' },
      // Propeller hub center
      { d: 'M 63 22 C 63 16 66 13 70 13 C 74 13 77 16 77 22 C 77 26 74 29 70 29 C 66 29 63 26 63 22 Z', fill: '#888888' },
      // Propeller hub rivet
      { d: 'M 67 22 C 67 19 68 18 70 18 C 72 18 73 19 73 22 C 73 24 72 25 70 25 C 68 25 67 24 67 22 Z', fill: '#555555' },
      // Blade 1 (orange, pointing up-left)
      { d: 'M 66 20 C 62 18 50 12 44 8 C 46 14 52 20 58 22 Z', fill: '#FF6B00' },
      // Blade 2 (yellow, pointing up-right)
      { d: 'M 74 20 C 78 18 90 12 96 8 C 94 14 88 20 82 22 Z', fill: '#FFD700' },
      // Blade 3 (orange, pointing down-right)
      { d: 'M 74 24 C 78 26 90 32 96 36 C 94 30 88 24 82 22 Z', fill: '#FF6B00' },
      // Blade 4 (yellow, pointing down-left)
      { d: 'M 66 24 C 62 26 50 32 44 36 C 46 30 52 24 58 22 Z', fill: '#FFD700' },
      // Panel color dividers on cap
      { d: 'M 70 20 L 70 76', fill: 'none', stroke: '#333399', strokeWidth: 1 },
      { d: 'M 40 38 C 46 32 58 26 70 24', fill: 'none', stroke: '#333399', strokeWidth: 1 },
      { d: 'M 100 38 C 94 32 82 26 70 24', fill: 'none', stroke: '#333399', strokeWidth: 1 },
    ],
  },

  'chef-hat': {
    name: 'Chef Hat',
    width: 140,
    height: 120,
    paths: [
      // White band base
      { d: 'M 22 90 L 22 74 C 22 70 42 66 70 66 C 98 66 118 70 118 74 L 118 90 C 118 96 98 100 70 100 C 42 100 22 96 22 90 Z', fill: '#ffffff' },
      // Band shadow bottom
      { d: 'M 22 88 C 22 92 42 96 70 96 C 98 96 118 92 118 88 L 118 92 C 118 98 98 102 70 102 C 42 102 22 98 22 92 Z', fill: '#dddddd' },
      // Band stitching lines
      { d: 'M 22 76 C 42 72 98 72 118 76', fill: 'none', stroke: '#cccccc', strokeWidth: 1 },
      { d: 'M 22 82 C 42 78 98 78 118 82', fill: 'none', stroke: '#cccccc', strokeWidth: 1 },
      // Puffy toque crown — multiple overlapping puffs
      { d: 'M 30 74 C 28 60 30 42 38 30 C 46 18 56 14 62 16 C 56 24 50 36 48 52 C 46 64 44 72 42 74 Z', fill: '#f0f0f0' },
      { d: 'M 44 72 C 42 58 44 38 52 24 C 58 14 66 10 70 10 C 74 10 82 14 88 24 C 96 38 98 58 96 72 Z', fill: '#f8f8f8' },
      { d: 'M 98 74 C 96 72 94 64 92 52 C 90 36 84 24 78 16 C 84 14 94 18 102 30 C 110 42 112 60 110 74 Z', fill: '#f0f0f0' },
      // Puff highlights
      { d: 'M 50 28 C 52 22 56 18 60 16 C 57 20 54 25 52 30 Z', fill: '#ffffff' },
      { d: 'M 68 14 C 70 12 72 12 74 14 C 72 14 70 14 68 14 Z', fill: '#ffffff' },
      { d: 'M 88 28 C 86 22 84 18 80 16 C 83 20 86 25 88 30 Z', fill: '#ffffff' },
      // Puff shadows/creases
      { d: 'M 44 72 C 45 60 47 46 50 34', fill: 'none', stroke: '#dddddd', strokeWidth: 2 },
      { d: 'M 96 72 C 95 60 93 46 90 34', fill: 'none', stroke: '#dddddd', strokeWidth: 2 },
    ],
  },

  'pirate-hat': {
    name: 'Pirate Hat',
    width: 140,
    height: 120,
    paths: [
      // Hat main body (bicorne shape)
      { d: 'M 16 80 C 10 72 14 56 30 48 C 42 42 56 40 70 40 C 84 40 98 42 110 48 C 126 56 130 72 124 80 C 114 92 92 96 70 96 C 48 96 26 92 16 80 Z', fill: '#1a1a1a' },
      // Hat brim front dip (darker center)
      { d: 'M 40 80 C 48 86 58 90 70 90 C 82 90 92 86 100 80 C 92 84 82 86 70 86 C 58 86 48 84 40 80 Z', fill: '#111111' },
      // White/cream trim along brim edge
      { d: 'M 16 80 C 20 74 28 70 40 68 L 38 72 C 28 74 20 78 18 82 Z', fill: '#fffde0' },
      { d: 'M 124 80 C 120 74 112 70 100 68 L 102 72 C 112 74 120 78 122 82 Z', fill: '#fffde0' },
      { d: 'M 40 68 C 50 66 60 64 70 64 C 80 64 90 66 100 68 L 100 72 C 90 70 80 68 70 68 C 60 68 50 70 40 72 Z', fill: '#fffde0' },
      // Skull face
      { d: 'M 58 54 C 58 46 63 42 70 42 C 77 42 82 46 82 54 C 82 60 79 64 76 66 L 76 68 L 64 68 L 64 66 C 61 64 58 60 58 54 Z', fill: '#fffde0' },
      // Skull eye sockets
      { d: 'M 62 52 C 62 49 64 47 66 47 C 68 47 70 49 70 52 C 70 54 68 56 66 56 C 64 56 62 54 62 52 Z', fill: '#1a1a1a' },
      { d: 'M 70 52 C 70 49 72 47 74 47 C 76 47 78 49 78 52 C 78 54 76 56 74 56 C 72 56 70 54 70 52 Z', fill: '#1a1a1a' },
      // Skull nose
      { d: 'M 68 58 L 70 56 L 72 58 L 71 60 L 69 60 Z', fill: '#1a1a1a' },
      // Skull teeth
      { d: 'M 64 68 L 64 70 L 66 70 L 66 68 Z', fill: '#1a1a1a' },
      { d: 'M 67 68 L 67 70 L 69 70 L 69 68 Z', fill: '#fffde0' },
      { d: 'M 70 68 L 70 70 L 72 70 L 72 68 Z', fill: '#1a1a1a' },
      { d: 'M 73 68 L 73 70 L 75 70 L 75 68 Z', fill: '#fffde0' },
      // Crossbones left
      { d: 'M 34 60 C 36 56 40 54 44 56 L 56 64 C 52 66 48 68 44 66 Z', fill: '#fffde0' },
      { d: 'M 34 68 C 36 72 40 74 44 72 L 56 64 C 52 62 48 60 44 62 Z', fill: '#fffde0' },
      // Crossbones right
      { d: 'M 106 60 C 104 56 100 54 96 56 L 84 64 C 88 66 92 68 96 66 Z', fill: '#fffde0' },
      { d: 'M 106 68 C 104 72 100 74 96 72 L 84 64 C 88 62 92 60 96 62 Z', fill: '#fffde0' },
    ],
  },

  'flower-crown': {
    name: 'Flower Crown',
    width: 140,
    height: 120,
    paths: [
      // Leaf wreath base
      { d: 'M 14 72 C 20 62 30 56 42 54 C 54 52 66 52 70 52 C 74 52 86 52 98 54 C 110 56 120 62 126 72', fill: 'none', stroke: '#228B22', strokeWidth: 6 },
      // Individual leaves along wreath
      { d: 'M 20 66 C 18 60 20 54 26 52 C 24 58 22 62 20 66 Z', fill: '#228B22' },
      { d: 'M 34 58 C 34 52 38 48 44 48 C 40 52 36 56 34 58 Z', fill: '#228B22' },
      { d: 'M 56 52 C 58 46 62 44 68 44 C 64 48 60 50 56 52 Z', fill: '#228B22' },
      { d: 'M 84 52 C 82 46 78 44 72 44 C 76 48 80 50 84 52 Z', fill: '#228B22' },
      { d: 'M 106 58 C 106 52 102 48 96 48 C 100 52 104 56 106 58 Z', fill: '#228B22' },
      { d: 'M 120 66 C 122 60 120 54 114 52 C 116 58 118 62 120 66 Z', fill: '#228B22' },
      // Rose (hot pink) — left
      { d: 'M 24 70 C 24 62 28 58 34 58 C 40 58 44 62 44 70 C 44 78 40 82 34 82 C 28 82 24 78 24 70 Z', fill: '#FF69B4' },
      { d: 'M 28 68 C 28 64 30 62 34 62 C 38 62 40 64 40 68 C 40 72 38 74 34 74 C 30 74 28 72 28 68 Z', fill: '#FF90C0' },
      { d: 'M 31 67 C 32 65 33 64 34 64 C 33 65 32 66 31 67 Z', fill: '#ffb0d0' },
      // Sunflower (yellow) — center-left
      { d: 'M 52 68 C 52 64 54 62 56 62 C 54 62 52 60 52 58 C 54 60 56 60 58 60 C 58 58 60 56 62 56 C 62 58 62 60 64 60 C 66 60 68 60 68 62 C 70 60 72 58 74 56 C 74 58 74 60 76 60 C 78 60 80 60 80 62 C 82 60 82 58 84 58 C 84 60 82 62 82 64 C 84 64 86 66 86 68 C 84 68 82 68 82 70 C 84 70 84 72 84 74 C 82 72 80 72 80 74 C 78 76 76 78 76 80 C 74 78 72 78 70 80 C 68 78 66 76 64 74 C 62 76 60 76 58 78 C 58 76 58 74 56 72 C 54 72 52 72 52 70 C 50 70 48 70 48 68 C 50 68 52 68 52 68 Z', fill: '#FFD700' },
      { d: 'M 60 64 C 60 60 63 58 68 58 C 73 58 76 60 76 64 C 76 68 73 70 68 70 C 63 70 60 68 60 64 Z', fill: '#5a3800' },
      // Lavender (purple) — center-right
      { d: 'M 88 58 C 90 54 92 52 94 52 C 92 56 90 60 90 64 Z', fill: '#9370DB' },
      { d: 'M 96 56 C 98 52 100 50 102 50 C 100 54 98 58 98 62 Z', fill: '#9370DB' },
      { d: 'M 92 62 C 94 58 96 56 100 56 C 100 60 98 64 96 68 Z', fill: '#9370DB' },
      { d: 'M 88 64 L 100 68', fill: 'none', stroke: '#228B22', strokeWidth: 2 },
      // Daisy (white) — right
      { d: 'M 100 72 C 100 68 102 66 104 66 C 102 64 100 62 100 60 C 102 62 104 62 106 60 C 106 62 108 64 110 62 C 110 64 110 66 112 66 C 114 66 114 68 114 70 C 114 72 112 72 112 74 C 114 74 114 76 112 76 C 110 78 108 78 108 80 C 106 78 104 78 102 80 C 102 78 100 76 100 76 C 98 76 96 74 96 72 C 98 72 100 72 100 72 Z', fill: '#ffffff' },
      { d: 'M 104 70 C 104 67 106 66 108 66 C 110 66 111 67 111 70 C 111 72 110 73 108 73 C 106 73 104 72 104 70 Z', fill: '#FFD700' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // EYEWEAR (width:130, height:70 each)
  // ─────────────────────────────────────────────────────────────

  'cool-shades': {
    name: 'Cool Shades',
    width: 130,
    height: 70,
    paths: [
      // Left lens (teardrop aviator shape)
      { d: 'M 10 20 C 10 10 18 6 28 6 C 38 6 50 10 54 22 C 58 34 54 46 44 50 C 34 54 20 50 14 42 C 8 34 8 28 10 20 Z', fill: 'rgba(0,0,0,0.85)' },
      // Left lens frame
      { d: 'M 10 20 C 10 10 18 6 28 6 C 38 6 50 10 54 22 C 58 34 54 46 44 50 C 34 54 20 50 14 42 C 8 34 8 28 10 20 Z', fill: 'none', stroke: '#1a1a1a', strokeWidth: 3 },
      // Right lens (mirrored)
      { d: 'M 120 20 C 120 10 112 6 102 6 C 92 6 80 10 76 22 C 72 34 76 46 86 50 C 96 54 110 50 116 42 C 122 34 122 28 120 20 Z', fill: 'rgba(0,0,0,0.85)' },
      { d: 'M 120 20 C 120 10 112 6 102 6 C 92 6 80 10 76 22 C 72 34 76 46 86 50 C 96 54 110 50 116 42 C 122 34 122 28 120 20 Z', fill: 'none', stroke: '#1a1a1a', strokeWidth: 3 },
      // Nose bridge
      { d: 'M 54 26 C 58 24 62 24 66 24 C 70 24 74 24 76 26', fill: 'none', stroke: '#333333', strokeWidth: 2.5 },
      // Left temple arm
      { d: 'M 10 24 C 6 22 2 22 2 28 C 2 34 4 40 6 44', fill: 'none', stroke: '#222222', strokeWidth: 2.5 },
      // Right temple arm
      { d: 'M 120 24 C 124 22 128 22 128 28 C 128 34 126 40 124 44', fill: 'none', stroke: '#222222', strokeWidth: 2.5 },
      // Lens reflection glints
      { d: 'M 16 14 C 18 11 22 10 26 11 C 22 12 18 13 16 14 Z', fill: '#333333' },
      { d: 'M 106 14 C 108 11 112 10 116 11 C 112 12 108 13 106 14 Z', fill: '#333333' },
    ],
  },

  'monocle': {
    name: 'Monocle',
    width: 130,
    height: 70,
    paths: [
      // Monocle lens circle
      { d: 'M 40 10 C 56 10 70 22 70 38 C 70 54 56 66 40 66 C 24 66 10 54 10 38 C 10 22 24 10 40 10 Z', fill: 'rgba(200,230,255,0.3)' },
      // Gold frame
      { d: 'M 40 10 C 56 10 70 22 70 38 C 70 54 56 66 40 66 C 24 66 10 54 10 38 C 10 22 24 10 40 10 Z', fill: 'none', stroke: '#C8A820', strokeWidth: 3.5 },
      // Frame inner ring detail
      { d: 'M 40 14 C 54 14 66 25 66 38 C 66 51 54 62 40 62 C 26 62 14 51 14 38 C 14 25 26 14 40 14 Z', fill: 'none', stroke: '#e0c030', strokeWidth: 1 },
      // Lens highlight
      { d: 'M 20 20 C 24 16 30 14 36 14 C 30 16 24 18 20 20 Z', fill: 'rgba(255,255,255,0.4)' },
      // Dark red ribbon hanging down-right
      { d: 'M 68 20 C 76 18 88 22 96 30 C 104 38 110 50 112 64', fill: 'none', stroke: '#8B0000', strokeWidth: 2.5 },
      // Ribbon end tassel
      { d: 'M 108 62 L 108 70 M 112 62 L 112 70 M 116 62 L 116 70', fill: 'none', stroke: '#8B0000', strokeWidth: 2 },
    ],
  },

  'star-glasses': {
    name: 'Star Glasses',
    width: 130,
    height: 70,
    paths: [
      // Left star lens (5-point star)
      { d: 'M 35 8 L 40 22 L 55 22 L 43 31 L 48 45 L 35 36 L 22 45 L 27 31 L 15 22 L 30 22 Z', fill: '#FFD700' },
      { d: 'M 35 8 L 40 22 L 55 22 L 43 31 L 48 45 L 35 36 L 22 45 L 27 31 L 15 22 L 30 22 Z', fill: 'none', stroke: '#FF69B4', strokeWidth: 3 },
      // Right star lens
      { d: 'M 95 8 L 100 22 L 115 22 L 103 31 L 108 45 L 95 36 L 82 45 L 87 31 L 75 22 L 90 22 Z', fill: '#FFD700' },
      { d: 'M 95 8 L 100 22 L 115 22 L 103 31 L 108 45 L 95 36 L 82 45 L 87 31 L 75 22 L 90 22 Z', fill: 'none', stroke: '#FF69B4', strokeWidth: 3 },
      // Star highlights
      { d: 'M 32 14 L 34 20 L 30 20 Z', fill: '#ffffff', opacity: 0.5 },
      { d: 'M 92 14 L 94 20 L 90 20 Z', fill: '#ffffff', opacity: 0.5 },
      // Nose bridge
      { d: 'M 55 28 C 60 26 65 26 70 26 C 75 26 80 26 75 28', fill: 'none', stroke: '#FF69B4', strokeWidth: 2.5 },
      // Temple arms
      { d: 'M 15 26 C 8 26 4 30 4 36', fill: 'none', stroke: '#FF69B4', strokeWidth: 2.5 },
      { d: 'M 115 26 C 122 26 126 30 126 36', fill: 'none', stroke: '#FF69B4', strokeWidth: 2.5 },
    ],
  },

  'heart-glasses': {
    name: 'Heart Glasses',
    width: 130,
    height: 70,
    paths: [
      // Left heart lens
      { d: 'M 35 14 C 35 10 38 8 41 8 C 44 8 47 10 47 14 C 47 10 50 8 53 8 C 56 8 59 10 59 14 C 59 22 47 34 47 38 C 47 34 35 22 35 14 Z', fill: '#FF69B4' },
      // Left heart frame
      { d: 'M 35 14 C 35 10 38 8 41 8 C 44 8 47 10 47 14 C 47 10 50 8 53 8 C 56 8 59 10 59 14 C 59 22 47 34 47 38 C 47 34 35 22 35 14 Z', fill: 'none', stroke: '#DC143C', strokeWidth: 3 },
      // Right heart lens
      { d: 'M 71 14 C 71 10 74 8 77 8 C 80 8 83 10 83 14 C 83 10 86 8 89 8 C 92 8 95 10 95 14 C 95 22 83 34 83 38 C 83 34 71 22 71 14 Z', fill: '#FF69B4' },
      { d: 'M 71 14 C 71 10 74 8 77 8 C 80 8 83 10 83 14 C 83 10 86 8 89 8 C 92 8 95 10 95 14 C 95 22 83 34 83 38 C 83 34 71 22 71 14 Z', fill: 'none', stroke: '#DC143C', strokeWidth: 3 },
      // Heart highlights
      { d: 'M 39 12 C 40 10 42 9 44 9 C 42 10 40 11 39 12 Z', fill: 'rgba(255,255,255,0.6)' },
      { d: 'M 75 12 C 76 10 78 9 80 9 C 78 10 76 11 75 12 Z', fill: 'rgba(255,255,255,0.6)' },
      // Nose bridge
      { d: 'M 59 20 C 63 18 67 18 71 20', fill: 'none', stroke: '#DC143C', strokeWidth: 2.5 },
      // Temple arms
      { d: 'M 35 16 C 26 16 20 20 18 28', fill: 'none', stroke: '#DC143C', strokeWidth: 2.5 },
      { d: 'M 95 16 C 104 16 110 20 112 28', fill: 'none', stroke: '#DC143C', strokeWidth: 2.5 },
    ],
  },

  'round-spectacles': {
    name: 'Round Spectacles',
    width: 130,
    height: 70,
    paths: [
      // Left round lens
      { d: 'M 12 35 C 12 20 22 10 35 10 C 48 10 58 20 58 35 C 58 50 48 60 35 60 C 22 60 12 50 12 35 Z', fill: 'rgba(220,240,220,0.2)' },
      // Left frame
      { d: 'M 12 35 C 12 20 22 10 35 10 C 48 10 58 20 58 35 C 58 50 48 60 35 60 C 22 60 12 50 12 35 Z', fill: 'none', stroke: '#8B6914', strokeWidth: 2 },
      // Right round lens
      { d: 'M 72 35 C 72 20 82 10 95 10 C 108 10 118 20 118 35 C 118 50 108 60 95 60 C 82 60 72 50 72 35 Z', fill: 'rgba(220,240,220,0.2)' },
      // Right frame
      { d: 'M 72 35 C 72 20 82 10 95 10 C 108 10 118 20 118 35 C 118 50 108 60 95 60 C 82 60 72 50 72 35 Z', fill: 'none', stroke: '#8B6914', strokeWidth: 2 },
      // Nose bridge (thin wire)
      { d: 'M 58 30 C 62 28 68 28 72 30', fill: 'none', stroke: '#8B6914', strokeWidth: 1.5 },
      // Left temple arm
      { d: 'M 12 28 C 8 24 4 24 2 30 C 2 38 4 48 6 56', fill: 'none', stroke: '#8B6914', strokeWidth: 1.5 },
      // Right temple arm
      { d: 'M 118 28 C 122 24 126 24 128 30 C 128 38 126 48 124 56', fill: 'none', stroke: '#8B6914', strokeWidth: 1.5 },
      // Lens reflections
      { d: 'M 18 18 C 22 15 28 13 32 13 C 26 15 20 17 18 18 Z', fill: 'rgba(200,230,200,0.4)' },
      { d: 'M 78 18 C 82 15 88 13 92 13 C 86 15 80 17 78 18 Z', fill: 'rgba(200,230,200,0.4)' },
    ],
  },

  'masquerade-mask': {
    name: 'Masquerade Mask',
    width: 130,
    height: 70,
    paths: [
      // Mask main body
      { d: 'M 4 10 C 4 6 10 4 20 4 C 36 4 46 10 52 20 C 56 26 58 32 58 38 L 72 38 C 72 32 74 26 78 20 C 84 10 94 4 110 4 C 120 4 126 6 126 10 L 126 36 C 126 46 120 54 110 58 C 102 62 94 60 90 56 L 86 52 C 82 48 78 46 72 46 L 58 46 C 52 46 48 48 44 52 L 40 56 C 36 60 28 62 20 58 C 10 54 4 46 4 36 Z', fill: '#6B21A8' },
      // Gold trim edge
      { d: 'M 4 10 C 4 6 10 4 20 4 C 36 4 46 10 52 20 C 56 26 58 32 58 38 L 72 38 C 72 32 74 26 78 20 C 84 10 94 4 110 4 C 120 4 126 6 126 10 L 126 36 C 126 46 120 54 110 58 C 102 62 94 60 90 56 L 86 52 C 82 48 78 46 72 46 L 58 46 C 52 46 48 48 44 52 L 40 56 C 36 60 28 62 20 58 C 10 54 4 46 4 36 Z', fill: 'none', stroke: '#FFD700', strokeWidth: 2.5 },
      // Left eye opening
      { d: 'M 18 20 C 18 14 24 12 32 12 C 40 12 48 16 50 24 C 50 30 46 34 40 34 C 32 34 18 30 18 20 Z', fill: '#000000', opacity: 0.8 },
      // Right eye opening
      { d: 'M 112 20 C 112 14 106 12 98 12 C 90 12 82 16 80 24 C 80 30 84 34 90 34 C 98 34 112 30 112 20 Z', fill: '#000000', opacity: 0.8 },
      // Purple feathers (right side)
      { d: 'M 126 10 C 132 4 138 2 140 6 C 138 10 132 14 126 16 Z', fill: '#9370DB' },
      { d: 'M 126 16 C 134 8 142 8 142 14 C 140 18 134 22 126 22 Z', fill: '#FFD700' },
      { d: 'M 124 22 C 130 14 138 16 138 22 C 136 28 130 30 124 28 Z', fill: '#9370DB' },
      // Gold embellishment dots
      { d: 'M 65 6 C 65 4 67 3 68 3 C 70 3 71 4 71 6 C 71 8 70 9 68 9 C 67 9 65 8 65 6 Z', fill: '#FFD700' },
      { d: 'M 58 4 C 58 2 60 1 62 1 C 64 1 66 2 66 4 C 66 6 64 7 62 7 C 60 7 58 6 58 4 Z', fill: '#FFD700' },
      { d: 'M 72 4 C 72 2 74 1 76 1 C 78 1 80 2 80 4 C 80 6 78 7 76 7 C 74 7 72 6 72 4 Z', fill: '#FFD700' },
      // Mask highlight
      { d: 'M 8 14 C 12 10 18 8 24 8 C 18 10 12 12 8 14 Z', fill: 'rgba(180,100,255,0.4)' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // NECKWEAR (width:130, height:100 each)
  // ─────────────────────────────────────────────────────────────

  'bow-tie': {
    name: 'Bow Tie',
    width: 130,
    height: 100,
    paths: [
      // Left wing
      { d: 'M 10 40 C 10 30 20 22 38 24 C 50 26 58 34 60 44 C 58 54 50 62 38 64 C 20 66 10 58 10 48 Z', fill: '#CC0000' },
      // Left wing shadow
      { d: 'M 10 44 C 10 36 16 30 26 28 C 18 34 14 42 14 50 C 14 56 16 62 20 66 C 12 60 10 52 10 44 Z', fill: '#990000' },
      // Left wing highlight
      { d: 'M 22 28 C 30 26 40 28 46 34 C 38 30 28 28 22 28 Z', fill: '#FF3333' },
      // Right wing
      { d: 'M 120 40 C 120 30 110 22 92 24 C 80 26 72 34 70 44 C 72 54 80 62 92 64 C 110 66 120 58 120 48 Z', fill: '#CC0000' },
      // Right wing shadow
      { d: 'M 120 44 C 120 36 114 30 104 28 C 112 34 116 42 116 50 C 116 56 114 62 110 66 C 118 60 120 52 120 44 Z', fill: '#990000' },
      // Right wing highlight
      { d: 'M 108 28 C 100 26 90 28 84 34 C 92 30 102 28 108 28 Z', fill: '#FF3333' },
      // Center knot
      { d: 'M 58 38 C 58 34 62 32 65 32 C 68 32 72 34 72 38 L 72 50 C 72 54 68 56 65 56 C 62 56 58 54 58 50 Z', fill: '#AA0000' },
      // Knot highlight
      { d: 'M 60 38 C 60 35 62 33 65 33 C 63 34 61 36 60 38 Z', fill: '#EE2222' },
      // Polka dots left wing
      { d: 'M 28 38 C 28 36 30 35 32 35 C 34 35 35 36 35 38 C 35 40 34 41 32 41 C 30 41 28 40 28 38 Z', fill: '#ffffff' },
      { d: 'M 40 48 C 40 46 42 45 44 45 C 46 45 47 46 47 48 C 47 50 46 51 44 51 C 42 51 40 50 40 48 Z', fill: '#ffffff' },
      { d: 'M 20 50 C 20 48 22 47 24 47 C 26 47 27 48 27 50 C 27 52 26 53 24 53 C 22 53 20 52 20 50 Z', fill: '#ffffff' },
      // Polka dots right wing
      { d: 'M 95 38 C 95 36 97 35 99 35 C 101 35 102 36 102 38 C 102 40 101 41 99 41 C 97 41 95 40 95 38 Z', fill: '#ffffff' },
      { d: 'M 83 48 C 83 46 85 45 87 45 C 89 45 90 46 90 48 C 90 50 89 51 87 51 C 85 51 83 50 83 48 Z', fill: '#ffffff' },
      { d: 'M 103 50 C 103 48 105 47 107 47 C 109 47 110 48 110 50 C 110 52 109 53 107 53 C 105 53 103 52 103 50 Z', fill: '#ffffff' },
    ],
  },

  'scarf': {
    name: 'Scarf',
    width: 130,
    height: 100,
    paths: [
      // Main scarf body wrap
      { d: 'M 10 20 C 20 16 40 14 65 14 C 90 14 110 16 120 20 L 120 36 C 110 40 90 42 65 42 C 40 42 20 40 10 36 Z', fill: '#FF8C00' },
      // Stripe 1 (yellow)
      { d: 'M 10 22 C 20 18 40 16 65 16 C 90 16 110 18 120 22 L 120 26 C 110 22 90 20 65 20 C 40 20 20 22 10 26 Z', fill: '#FFD700' },
      // Stripe 2 (yellow)
      { d: 'M 10 30 C 20 26 40 24 65 24 C 90 24 110 26 120 30 L 120 34 C 110 30 90 28 65 28 C 40 28 20 30 10 34 Z', fill: '#FFD700' },
      // Left hanging end
      { d: 'M 10 30 C 8 36 6 46 8 58 C 10 68 14 78 16 86 C 14 78 12 68 10 58 C 8 48 8 38 10 30 Z', fill: '#FF8C00' },
      { d: 'M 10 30 L 26 30 L 26 86 C 26 90 22 92 18 90 C 14 88 10 84 10 78 Z', fill: '#FF8C00' },
      // Left end stripes
      { d: 'M 12 30 L 14 30 L 14 86 L 12 86 Z', fill: '#FFD700' },
      { d: 'M 18 30 L 20 30 L 20 86 L 18 86 Z', fill: '#FFD700' },
      // Left fringe
      { d: 'M 10 86 L 10 96 M 14 86 L 14 96 M 18 86 L 18 96 M 22 86 L 22 96 M 26 86 L 26 96', fill: 'none', stroke: '#FF6B00', strokeWidth: 2 },
      // Right hanging end
      { d: 'M 104 30 L 120 30 L 120 78 C 120 84 116 88 112 90 C 108 92 104 90 104 86 Z', fill: '#FF8C00' },
      // Right end stripes
      { d: 'M 106 30 L 108 30 L 108 86 L 106 86 Z', fill: '#FFD700' },
      { d: 'M 112 30 L 114 30 L 114 86 L 112 86 Z', fill: '#FFD700' },
      // Right fringe
      { d: 'M 104 86 L 104 96 M 108 86 L 108 96 M 112 86 L 112 96 M 116 86 L 116 96 M 120 86 L 120 96', fill: 'none', stroke: '#FF6B00', strokeWidth: 2 },
      // Scarf shadow fold
      { d: 'M 10 36 C 20 40 40 42 65 42 C 90 42 110 40 120 36 L 120 40 C 110 44 90 46 65 46 C 40 46 20 44 10 40 Z', fill: '#CC6600' },
    ],
  },

  'necktie': {
    name: 'Necktie',
    width: 130,
    height: 100,
    paths: [
      // Collar/top knot area
      { d: 'M 50 8 C 52 4 58 2 65 2 C 72 2 78 4 80 8 L 82 20 C 78 22 72 24 65 24 C 58 24 52 22 50 20 Z', fill: '#1E3A8A' },
      // Knot
      { d: 'M 56 18 C 58 14 62 12 65 12 C 68 12 72 14 74 18 L 76 26 C 74 30 70 32 65 32 C 60 32 56 30 54 26 Z', fill: '#0F1F50' },
      // Knot highlight
      { d: 'M 58 18 C 60 15 62 14 65 14 C 63 16 60 18 58 20 Z', fill: '#2E5AB5' },
      // Main tie body (narrow to wide blade)
      { d: 'M 58 28 C 60 26 65 25 70 26 L 80 60 C 82 72 80 84 76 92 L 65 98 L 54 92 C 50 84 48 72 50 60 Z', fill: '#1E3A8A' },
      // Diagonal stripe 1
      { d: 'M 56 38 C 60 36 68 36 72 38 L 74 44 C 70 42 62 42 58 44 Z', fill: '#4169E1' },
      // Diagonal stripe 2
      { d: 'M 52 56 C 56 54 72 54 76 56 L 78 62 C 74 60 58 60 54 62 Z', fill: '#4169E1' },
      // Diagonal stripe 3
      { d: 'M 50 72 C 54 70 76 70 80 72 L 80 78 C 76 76 54 76 50 78 Z', fill: '#4169E1' },
      // Tie blade point bottom
      { d: 'M 58 90 C 60 94 65 98 65 98 L 54 92 C 56 92 58 91 58 90 Z', fill: '#0F1F50' },
      // Shadow on left edge
      { d: 'M 58 28 L 50 60 C 48 72 50 84 54 92 C 50 82 48 70 50 58 L 58 28 Z', fill: '#0F1F50' },
    ],
  },

  'bandana': {
    name: 'Bandana',
    width: 130,
    height: 100,
    paths: [
      // Main bandana triangle front
      { d: 'M 15 18 C 30 14 50 12 65 12 C 80 12 100 14 115 18 L 90 60 C 80 72 70 80 65 82 C 60 80 50 72 40 60 Z', fill: '#DC143C' },
      // Folded band across top
      { d: 'M 15 18 C 30 14 50 12 65 12 C 80 12 100 14 115 18 L 115 28 C 100 24 80 22 65 22 C 50 22 30 24 15 28 Z', fill: '#CC1030' },
      // Paisley dot pattern on triangle
      { d: 'M 55 40 C 55 36 58 34 62 34 C 66 34 68 36 68 40 C 68 44 66 46 62 46 C 58 46 55 44 55 40 Z', fill: '#8B0000' },
      { d: 'M 48 54 C 48 51 50 50 52 50 C 54 50 56 51 56 54 C 56 57 54 58 52 58 C 50 58 48 57 48 54 Z', fill: '#8B0000' },
      { d: 'M 72 52 C 72 49 74 48 76 48 C 78 48 80 49 80 52 C 80 55 78 56 76 56 C 74 56 72 55 72 52 Z', fill: '#8B0000' },
      { d: 'M 60 64 C 60 62 62 61 64 61 C 66 61 68 62 68 64 C 68 66 66 67 64 67 C 62 67 60 66 60 64 Z', fill: '#8B0000' },
      // Teardrop paisley shapes
      { d: 'M 50 36 C 50 32 52 28 56 28 C 54 30 52 34 52 38 C 50 38 50 37 50 36 Z', fill: '#8B0000' },
      { d: 'M 76 42 C 78 38 82 36 84 38 C 82 38 80 40 78 44 C 77 44 76 43 76 42 Z', fill: '#8B0000' },
      // Knot/tie at back (center top detail)
      { d: 'M 55 16 C 60 12 65 10 65 10 C 65 10 70 12 75 16 C 70 14 65 13 65 13 C 65 13 60 14 55 16 Z', fill: '#AA0020' },
    ],
  },

  'pearl-necklace': {
    name: 'Pearl Necklace',
    width: 130,
    height: 100,
    paths: [
      // Necklace string/cord
      { d: 'M 15 30 C 30 20 50 16 65 16 C 80 16 100 20 115 30', fill: 'none', stroke: '#C8A820', strokeWidth: 1 },
      // Pearls along the curve — each is a circle
      // Pearl 1
      { d: 'M 18 32 C 18 28 21 26 24 26 C 27 26 30 28 30 32 C 30 36 27 38 24 38 C 21 38 18 36 18 32 Z', fill: '#F8F0E3' },
      { d: 'M 20 29 C 21 28 23 27 24 27 C 23 28 21 29 20 29 Z', fill: '#ffffff' },
      // Pearl 2
      { d: 'M 30 24 C 30 20 33 18 36 18 C 39 18 42 20 42 24 C 42 28 39 30 36 30 C 33 30 30 28 30 24 Z', fill: '#F8F0E3' },
      { d: 'M 32 21 C 33 20 35 19 36 19 C 35 20 33 21 32 21 Z', fill: '#ffffff' },
      // Pearl 3
      { d: 'M 44 18 C 44 14 47 12 50 12 C 53 12 56 14 56 18 C 56 22 53 24 50 24 C 47 24 44 22 44 18 Z', fill: '#F8F0E3' },
      { d: 'M 46 15 C 47 14 49 13 50 13 C 49 14 47 15 46 15 Z', fill: '#ffffff' },
      // Pearl 4 (center)
      { d: 'M 58 16 C 58 12 61 10 65 10 C 69 10 72 12 72 16 C 72 20 69 22 65 22 C 61 22 58 20 58 16 Z', fill: '#F8F0E3' },
      { d: 'M 60 13 C 62 12 64 11 65 11 C 64 12 62 13 60 13 Z', fill: '#ffffff' },
      // Pearl 5
      { d: 'M 74 18 C 74 14 77 12 80 12 C 83 12 86 14 86 18 C 86 22 83 24 80 24 C 77 24 74 22 74 18 Z', fill: '#F8F0E3' },
      { d: 'M 76 15 C 77 14 79 13 80 13 C 79 14 77 15 76 15 Z', fill: '#ffffff' },
      // Pearl 6
      { d: 'M 88 24 C 88 20 91 18 94 18 C 97 18 100 20 100 24 C 100 28 97 30 94 30 C 91 30 88 28 88 24 Z', fill: '#F8F0E3' },
      { d: 'M 90 21 C 91 20 93 19 94 19 C 93 20 91 21 90 21 Z', fill: '#ffffff' },
      // Pearl 7
      { d: 'M 100 32 C 100 28 103 26 106 26 C 109 26 112 28 112 32 C 112 36 109 38 106 38 C 103 38 100 36 100 32 Z', fill: '#F8F0E3' },
      { d: 'M 102 29 C 103 28 105 27 106 27 C 105 28 103 29 102 29 Z', fill: '#ffffff' },
      // Gold clasp at back
      { d: 'M 112 34 C 114 30 118 30 120 34 C 118 36 114 36 112 34 Z', fill: '#C8A820' },
      // Pendant pearl (slightly larger, center hanging)
      { d: 'M 57 22 C 57 18 61 16 65 16 C 69 16 73 18 73 22 L 70 38 C 70 42 68 46 65 48 C 62 46 60 42 60 38 Z', fill: '#F8F0E3' },
      { d: 'M 59 22 C 60 19 62 17 65 17 C 62 19 60 21 59 22 Z', fill: '#ffffff' },
    ],
  },

  'hawaiian-lei': {
    name: 'Hawaiian Lei',
    width: 130,
    height: 100,
    paths: [
      // Lei cord
      { d: 'M 10 40 C 30 28 50 22 65 22 C 80 22 100 28 120 40', fill: 'none', stroke: '#228B22', strokeWidth: 3 },
      // Flowers along the lei — alternating colors
      // Hot pink flower 1 (left)
      { d: 'M 14 40 C 14 36 16 34 18 34 C 16 32 14 30 16 28 C 18 30 18 32 20 32 C 22 30 22 28 24 28 C 24 30 22 32 24 34 C 26 34 28 36 28 40 C 26 40 24 38 22 40 C 22 42 24 44 22 46 C 20 44 20 42 18 42 C 16 44 16 46 14 44 C 16 42 16 40 14 40 Z', fill: '#FF69B4' },
      { d: 'M 17 39 C 17 37 18 36 20 36 C 22 36 23 37 23 39 C 23 41 22 42 20 42 C 18 42 17 41 17 39 Z', fill: '#FF90C8' },
      // Orange flower 2
      { d: 'M 32 30 C 32 26 34 24 36 24 C 34 22 32 20 34 18 C 36 20 36 22 38 22 C 40 20 40 18 42 18 C 42 20 40 22 42 24 C 44 24 46 26 46 30 C 44 30 42 28 40 30 C 40 32 42 34 40 36 C 38 34 38 32 36 32 C 34 34 34 36 32 34 C 34 32 34 30 32 30 Z', fill: '#FF8C00' },
      { d: 'M 35 29 C 35 27 36 26 38 26 C 40 26 41 27 41 29 C 41 31 40 32 38 32 C 36 32 35 31 35 29 Z', fill: '#FFAA30' },
      // Yellow flower 3 (center-left)
      { d: 'M 50 24 C 50 20 52 18 54 18 C 52 16 50 14 52 12 C 54 14 54 16 56 16 C 58 14 58 12 60 12 C 60 14 58 16 60 18 C 62 18 64 20 64 24 C 62 24 60 22 58 24 C 58 26 60 28 58 30 C 56 28 56 26 54 26 C 52 28 52 30 50 28 C 52 26 52 24 50 24 Z', fill: '#FFD700' },
      { d: 'M 53 23 C 53 21 54 20 56 20 C 58 20 59 21 59 23 C 59 25 58 26 56 26 C 54 26 53 25 53 23 Z', fill: '#FFE040' },
      // Purple flower 4 (center)
      { d: 'M 68 22 C 68 18 70 16 72 16 C 70 14 68 12 70 10 C 72 12 72 14 74 14 C 76 12 76 10 78 10 C 78 12 76 14 78 16 C 80 16 82 18 82 22 C 80 22 78 20 76 22 C 76 24 78 26 76 28 C 74 26 74 24 72 24 C 70 26 70 28 68 26 C 70 24 70 22 68 22 Z', fill: '#9370DB' },
      { d: 'M 71 21 C 71 19 72 18 74 18 C 76 18 77 19 77 21 C 77 23 76 24 74 24 C 72 24 71 23 71 21 Z', fill: '#AA88EE' },
      // Hot pink flower 5 (center-right)
      { d: 'M 86 26 C 86 22 88 20 90 20 C 88 18 86 16 88 14 C 90 16 90 18 92 18 C 94 16 94 14 96 14 C 96 16 94 18 96 20 C 98 20 100 22 100 26 C 98 26 96 24 94 26 C 94 28 96 30 94 32 C 92 30 92 28 90 28 C 88 30 88 32 86 30 C 88 28 88 26 86 26 Z', fill: '#FF69B4' },
      { d: 'M 89 25 C 89 23 90 22 92 22 C 94 22 95 23 95 25 C 95 27 94 28 92 28 C 90 28 89 27 89 25 Z', fill: '#FF90C8' },
      // Orange flower 6 (right)
      { d: 'M 102 34 C 102 30 104 28 106 28 C 104 26 102 24 104 22 C 106 24 106 26 108 26 C 110 24 110 22 112 22 C 112 24 110 26 112 28 C 114 28 116 30 116 34 C 114 34 112 32 110 34 C 110 36 112 38 110 40 C 108 38 108 36 106 36 C 104 38 104 40 102 38 C 104 36 104 34 102 34 Z', fill: '#FF8C00' },
      { d: 'M 105 33 C 105 31 106 30 108 30 C 110 30 111 31 111 33 C 111 35 110 36 108 36 C 106 36 105 35 105 33 Z', fill: '#FFAA30' },
      // Leaf accents
      { d: 'M 28 38 C 24 36 22 42 26 44 C 28 42 28 40 28 38 Z', fill: '#228B22' },
      { d: 'M 64 26 C 62 22 66 18 68 22 C 67 22 66 24 64 26 Z', fill: '#228B22' },
      { d: 'M 100 30 C 102 26 106 28 104 32 C 103 30 102 30 100 30 Z', fill: '#228B22' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // TOPS (width:180, height:160 each)
  // ─────────────────────────────────────────────────────────────

  'vest': {
    name: 'Vest',
    width: 180,
    height: 160,
    paths: [
      // Main vest body
      { d: 'M 40 20 C 40 14 50 10 60 10 L 120 10 C 130 10 140 14 140 20 L 150 120 C 150 130 140 138 130 138 L 50 138 C 40 138 30 130 30 120 Z', fill: '#8B4513' },
      // Left lapel
      { d: 'M 60 10 C 56 16 54 26 56 38 C 60 46 68 50 70 50 L 90 50 L 80 10 Z', fill: '#6B3410' },
      // Right lapel
      { d: 'M 120 10 C 124 16 126 26 124 38 C 120 46 112 50 110 50 L 90 50 L 100 10 Z', fill: '#6B3410' },
      // V-neck opening (dark)
      { d: 'M 78 12 L 90 50 L 102 12 C 98 10 82 10 78 12 Z', fill: '#3a1a06' },
      // Center button placket
      { d: 'M 86 50 L 86 135 L 94 135 L 94 50 Z', fill: '#7A3C0E' },
      // Buttons (gold)
      { d: 'M 88 60 C 88 57 90 56 90 56 C 92 56 94 57 94 60 C 94 63 92 64 90 64 C 88 64 88 63 88 60 Z', fill: '#C8A820' },
      { d: 'M 88 78 C 88 75 90 74 90 74 C 92 74 94 75 94 78 C 94 81 92 82 90 82 C 88 82 88 81 88 78 Z', fill: '#C8A820' },
      { d: 'M 88 96 C 88 93 90 92 90 92 C 92 92 94 93 94 96 C 94 99 92 100 90 100 C 88 100 88 99 88 96 Z', fill: '#C8A820' },
      { d: 'M 88 114 C 88 111 90 110 90 110 C 92 110 94 111 94 114 C 94 117 92 118 90 118 C 88 118 88 117 88 114 Z', fill: '#C8A820' },
      // Left chest pocket
      { d: 'M 46 58 L 46 78 L 66 78 L 66 58 Z', fill: '#7A3C0E' },
      { d: 'M 44 56 L 44 60 L 68 60 L 68 56 Z', fill: '#6B3410' },
      // Pocket flap
      { d: 'M 54 68 C 54 66 56 65 56 65 C 58 65 60 66 60 68 C 60 70 58 71 56 71 C 54 71 54 70 54 68 Z', fill: '#C8A820' },
      // Shadow on right side
      { d: 'M 130 10 L 150 120 C 150 130 140 138 130 138 L 140 138 C 150 138 160 130 160 120 L 148 20 C 148 14 140 10 130 10 Z', fill: '#6B3410' },
      // Highlight on left
      { d: 'M 40 20 L 30 120 C 30 130 40 138 50 138 L 40 138 C 30 138 20 130 20 120 L 32 20 C 32 14 38 10 46 10 L 40 10 C 40 14 40 16 40 20 Z', fill: '#9B5523' },
    ],
  },

  't-shirt': {
    name: 'T-Shirt',
    width: 180,
    height: 160,
    paths: [
      // Main body
      { d: 'M 30 50 L 30 140 C 30 148 38 154 50 154 L 130 154 C 142 154 150 148 150 140 L 150 50 Z', fill: '#f0f0f0' },
      // Left sleeve
      { d: 'M 30 50 L 10 40 C 4 36 2 30 6 26 L 20 18 C 24 14 30 16 34 22 L 44 42 Z', fill: '#f0f0f0' },
      // Left sleeve shadow
      { d: 'M 10 40 C 4 36 2 30 6 26 L 12 22 C 8 28 10 36 14 40 Z', fill: '#dddddd' },
      // Right sleeve
      { d: 'M 150 50 L 170 40 C 176 36 178 30 174 26 L 160 18 C 156 14 150 16 146 22 L 136 42 Z', fill: '#f0f0f0' },
      // Right sleeve shadow
      { d: 'M 170 40 C 176 36 178 30 174 26 L 168 22 C 172 28 170 36 166 40 Z', fill: '#dddddd' },
      // Collar
      { d: 'M 64 50 C 68 42 78 38 90 38 C 102 38 112 42 116 50 L 116 56 C 112 48 102 44 90 44 C 78 44 68 48 64 56 Z', fill: '#dddddd' },
      // Collar inner shadow
      { d: 'M 70 50 C 74 44 80 42 90 42 C 100 42 106 44 110 50 C 106 46 100 44 90 44 C 80 44 74 46 70 50 Z', fill: '#cccccc' },
      // Blue star graphic on chest
      { d: 'M 90 72 L 95 86 L 110 86 L 98 95 L 103 109 L 90 100 L 77 109 L 82 95 L 70 86 L 85 86 Z', fill: '#4169E1' },
      // Star highlight
      { d: 'M 90 72 L 93 80 L 86 80 Z', fill: '#6080FF' },
      // Body side shadows
      { d: 'M 30 50 L 30 140 C 30 148 38 154 50 154 L 42 154 C 32 154 26 148 26 140 L 26 50 Z', fill: '#dddddd' },
      { d: 'M 150 50 L 150 140 C 150 148 142 154 130 154 L 138 154 C 148 154 154 148 154 140 L 154 50 Z', fill: '#dddddd' },
      // Bottom hem
      { d: 'M 30 148 C 38 152 60 154 90 154 C 120 154 142 152 150 148 L 150 154 C 142 158 120 160 90 160 C 60 160 38 158 30 154 Z', fill: '#e0e0e0' },
    ],
  },

  'hawaiian-shirt': {
    name: 'Hawaiian Shirt',
    width: 180,
    height: 160,
    paths: [
      // Main body
      { d: 'M 30 50 L 30 148 C 30 154 40 158 55 158 L 125 158 C 140 158 150 154 150 148 L 150 50 Z', fill: '#0066CC' },
      // Left sleeve
      { d: 'M 30 50 L 8 40 C 2 36 0 28 4 22 L 18 14 C 22 10 30 12 34 20 L 46 46 Z', fill: '#0066CC' },
      // Right sleeve
      { d: 'M 150 50 L 172 40 C 178 36 180 28 176 22 L 162 14 C 158 10 150 12 146 20 L 134 46 Z', fill: '#0066CC' },
      // Open collar left
      { d: 'M 70 50 L 60 50 L 52 70 L 90 90 Z', fill: '#005BB5' },
      // Open collar right
      { d: 'M 110 50 L 120 50 L 128 70 L 90 90 Z', fill: '#005BB5' },
      // Collar inner
      { d: 'M 70 50 L 90 90 L 110 50 C 106 46 100 44 90 44 C 80 44 74 46 70 50 Z', fill: '#004499' },
      // Flower pattern 1 (pink hibiscus)
      { d: 'M 50 80 C 50 76 52 74 54 74 C 52 72 50 70 52 68 C 54 70 54 72 56 72 C 58 70 58 68 60 68 C 60 70 58 72 60 74 C 62 74 64 76 64 80 C 62 80 60 78 58 80 C 58 82 60 84 58 86 C 56 84 56 82 54 82 C 52 84 52 86 50 84 C 52 82 52 80 50 80 Z', fill: '#FF69B4' },
      { d: 'M 53 79 C 53 77 54 76 57 76 C 60 76 61 77 61 79 C 61 81 60 82 57 82 C 54 82 53 81 53 79 Z', fill: '#FFD700' },
      // Flower pattern 2 (yellow)
      { d: 'M 116 70 C 116 66 118 64 120 64 C 118 62 116 60 118 58 C 120 60 120 62 122 62 C 124 60 124 58 126 58 C 126 60 124 62 126 64 C 128 64 130 66 130 70 C 128 70 126 68 124 70 C 124 72 126 74 124 76 C 122 74 122 72 120 72 C 118 74 118 76 116 74 C 118 72 118 70 116 70 Z', fill: '#FFD700' },
      { d: 'M 119 69 C 119 67 120 66 123 66 C 126 66 127 67 127 69 C 127 71 126 72 123 72 C 120 72 119 71 119 69 Z', fill: '#FF8C00' },
      // Leaf accents
      { d: 'M 64 88 C 60 84 60 92 66 94 C 66 92 65 90 64 88 Z', fill: '#228B22' },
      { d: 'M 40 60 C 36 56 36 64 42 66 C 42 64 41 62 40 60 Z', fill: '#228B22' },
      { d: 'M 130 90 C 134 86 134 94 128 96 C 128 94 129 92 130 90 Z', fill: '#228B22' },
      // Button placket
      { d: 'M 86 90 L 86 155 L 94 155 L 94 90 Z', fill: '#005BB5' },
      // Buttons
      { d: 'M 90 100 C 88 100 87 101 87 103 C 87 105 88 106 90 106 C 92 106 93 105 93 103 C 93 101 92 100 90 100 Z', fill: '#ffffff' },
      { d: 'M 90 118 C 88 118 87 119 87 121 C 87 123 88 124 90 124 C 92 124 93 123 93 121 C 93 119 92 118 90 118 Z', fill: '#ffffff' },
      { d: 'M 90 136 C 88 136 87 137 87 139 C 87 141 88 142 90 142 C 92 142 93 141 93 139 C 93 137 92 136 90 136 Z', fill: '#ffffff' },
    ],
  },

  'knight-armor': {
    name: 'Knight Armor',
    width: 180,
    height: 160,
    paths: [
      // Chest plate main
      { d: 'M 30 40 L 30 140 C 30 150 44 158 60 158 L 120 158 C 136 158 150 150 150 140 L 150 40 C 140 30 120 24 90 24 C 60 24 40 30 30 40 Z', fill: '#C0C0C0' },
      // Chest plate highlight (left)
      { d: 'M 30 40 C 40 30 60 24 90 24 C 90 24 60 28 44 40 L 36 120 C 32 108 30 80 30 40 Z', fill: '#D8D8D8' },
      // Chest plate shadow (right)
      { d: 'M 150 40 C 140 30 120 24 90 24 C 90 24 120 28 136 40 L 144 120 C 148 108 150 80 150 40 Z', fill: '#A8A8A8' },
      // Gorget (neck guard)
      { d: 'M 62 24 C 66 18 76 14 90 14 C 104 14 114 18 118 24 L 118 40 C 114 34 104 30 90 30 C 76 30 66 34 62 40 Z', fill: '#AAAAAA' },
      // Gorget scales
      { d: 'M 64 28 C 68 26 78 24 90 24 C 102 24 112 26 116 28 L 114 34 C 110 30 102 28 90 28 C 78 28 70 30 66 34 Z', fill: '#C0C0C0' },
      // Pauldrons (shoulder guards) left
      { d: 'M 16 44 C 16 36 24 30 34 30 L 50 36 C 44 40 38 48 36 58 L 24 62 C 18 58 16 52 16 44 Z', fill: '#B0B0B0' },
      { d: 'M 16 44 C 18 40 22 36 28 34 L 34 30 C 26 34 18 40 16 44 Z', fill: '#D0D0D0' },
      // Pauldrons right
      { d: 'M 164 44 C 164 36 156 30 146 30 L 130 36 C 136 40 142 48 144 58 L 156 62 C 162 58 164 52 164 44 Z', fill: '#B0B0B0' },
      { d: 'M 164 44 C 162 40 158 36 152 34 L 146 30 C 154 34 162 40 164 44 Z', fill: '#D0D0D0' },
      // Breastplate center ridge
      { d: 'M 88 40 L 88 140 L 92 140 L 92 40 Z', fill: '#A0A0A0' },
      // Gold cross emblem
      { d: 'M 82 68 L 82 108 L 98 108 L 98 68 Z', fill: '#C8A820' },
      { d: 'M 70 82 L 70 94 L 110 94 L 110 82 Z', fill: '#C8A820' },
      // Cross highlight
      { d: 'M 82 68 L 84 68 L 84 108 L 82 108 Z', fill: '#E0C030' },
      // Rivets
      { d: 'M 44 50 C 44 48 46 47 48 47 C 50 47 51 48 51 50 C 51 52 50 53 48 53 C 46 53 44 52 44 50 Z', fill: '#999999' },
      { d: 'M 129 50 C 129 48 131 47 133 47 C 135 47 136 48 136 50 C 136 52 135 53 133 53 C 131 53 129 52 129 50 Z', fill: '#999999' },
      { d: 'M 44 120 C 44 118 46 117 48 117 C 50 117 51 118 51 120 C 51 122 50 123 48 123 C 46 123 44 122 44 120 Z', fill: '#999999' },
      { d: 'M 129 120 C 129 118 131 117 133 117 C 135 117 136 118 136 120 C 136 122 135 123 133 123 C 131 123 129 122 129 120 Z', fill: '#999999' },
      // Gold trim at bottom
      { d: 'M 30 140 C 44 148 64 152 90 152 C 116 152 136 148 150 140 L 150 146 C 136 154 116 158 90 158 C 64 158 44 154 30 146 Z', fill: '#C8A820' },
    ],
  },

  'sports-jersey': {
    name: 'Sports Jersey',
    width: 180,
    height: 160,
    paths: [
      // Main jersey body
      { d: 'M 28 50 L 28 148 C 28 154 40 158 58 158 L 122 158 C 140 158 152 154 152 148 L 152 50 Z', fill: '#DC143C' },
      // Left sleeve
      { d: 'M 28 50 L 6 42 C 0 38 -2 30 2 24 L 16 14 C 20 10 28 12 32 20 L 44 48 Z', fill: '#DC143C' },
      // Right sleeve
      { d: 'M 152 50 L 174 42 C 180 38 182 30 178 24 L 164 14 C 160 10 152 12 148 20 L 136 48 Z', fill: '#DC143C' },
      // Collar
      { d: 'M 66 50 C 70 42 78 38 90 38 C 102 38 110 42 114 50 L 114 56 C 110 48 102 44 90 44 C 78 44 70 48 66 56 Z', fill: '#8B0000' },
      // White side stripes
      { d: 'M 28 60 L 28 148 L 48 148 L 48 60 Z', fill: '#ffffff' },
      { d: 'M 152 60 L 152 148 L 132 148 L 132 60 Z', fill: '#ffffff' },
      // Sleeve white stripes
      { d: 'M 6 42 L 14 54 L 22 50 L 14 38 Z', fill: '#ffffff' },
      { d: 'M 174 42 L 166 54 L 158 50 L 166 38 Z', fill: '#ffffff' },
      // Big number "1" on chest
      { d: 'M 86 70 L 86 130 L 94 130 L 94 70 Z', fill: '#ffffff' },
      { d: 'M 78 70 L 86 70 L 86 78 L 78 78 Z', fill: '#ffffff' },
      { d: 'M 78 126 L 102 126 L 102 134 L 78 134 Z', fill: '#ffffff' },
      // Jersey shadow on sides
      { d: 'M 28 50 L 28 148 C 28 154 40 158 58 158 L 48 158 C 36 158 26 154 26 148 L 26 50 Z', fill: '#CC0000' },
    ],
  },

  'suspenders': {
    name: 'Suspenders',
    width: 180,
    height: 160,
    paths: [
      // Left strap (from left shoulder down to right hip — X crossing)
      { d: 'M 40 10 C 44 10 50 12 52 16 L 100 140 C 102 146 100 152 96 154 L 88 156 C 84 156 82 152 84 146 L 36 22 C 34 16 36 10 40 10 Z', fill: '#DC143C' },
      // Left strap highlight
      { d: 'M 40 10 C 42 10 44 12 45 14 L 38 14 C 37 12 38 10 40 10 Z', fill: '#FF3333' },
      // Right strap (from right shoulder down to left hip)
      { d: 'M 140 10 C 136 10 130 12 128 16 L 80 140 C 78 146 80 152 84 154 L 92 156 C 96 156 98 152 96 146 L 144 22 C 146 16 144 10 140 10 Z', fill: '#DC143C' },
      // Right strap highlight
      { d: 'M 140 10 C 138 10 136 12 135 14 L 142 14 C 143 12 142 10 140 10 Z', fill: '#FF3333' },
      // X crossing center (overlap highlight)
      { d: 'M 82 76 C 80 72 84 68 88 70 L 98 78 C 100 82 96 86 92 84 Z', fill: '#BB0000' },
      // Left shoulder clip
      { d: 'M 34 8 C 34 4 38 2 42 2 C 46 2 50 4 52 8 L 52 16 L 34 16 Z', fill: '#C8A820' },
      { d: 'M 36 8 L 50 8 L 50 12 L 36 12 Z', fill: '#E0C030' },
      // Right shoulder clip
      { d: 'M 146 8 C 146 4 142 2 138 2 C 134 2 130 4 128 8 L 128 16 L 146 16 Z', fill: '#C8A820' },
      { d: 'M 144 8 L 130 8 L 130 12 L 144 12 Z', fill: '#E0C030' },
      // Left waist clip
      { d: 'M 82 152 C 80 156 80 160 84 160 L 92 160 C 96 160 98 156 98 152 L 82 152 Z', fill: '#C8A820' },
      { d: 'M 83 153 L 97 153 L 97 157 L 83 157 Z', fill: '#E0C030' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // CAPES (width:200, height:200 each)
  // ─────────────────────────────────────────────────────────────

  'superhero-cape': {
    name: 'Superhero Cape',
    width: 200,
    height: 200,
    paths: [
      // Cape outer (flowing, red)
      { d: 'M 40 10 C 70 8 130 8 160 10 C 170 40 180 80 190 120 C 196 150 198 175 195 190 C 180 196 160 198 140 192 L 100 160 L 60 192 C 40 198 20 196 5 190 C 2 175 4 150 10 120 C 20 80 30 40 40 10 Z', fill: '#DC143C' },
      // Cape inner lining (dark red) — visible on curled edges
      { d: 'M 40 10 C 36 20 32 36 28 56 L 14 140 C 8 168 6 182 8 192 C 20 196 40 198 60 192 L 100 160 L 60 192 C 42 196 24 194 10 190 C 8 178 10 160 16 136 L 34 48 C 38 30 40 16 40 10 Z', fill: '#8B0000' },
      { d: 'M 160 10 C 164 20 168 36 172 56 L 186 140 C 192 168 194 182 192 192 C 180 196 160 198 140 192 L 100 160 L 140 192 C 158 196 176 194 190 190 C 192 178 190 160 184 136 L 166 48 C 162 30 160 16 160 10 Z', fill: '#8B0000' },
      // Shoulder yoke/collar
      { d: 'M 40 10 C 60 4 80 2 100 2 C 120 2 140 4 160 10 L 155 22 C 140 16 122 12 100 12 C 78 12 60 16 45 22 Z', fill: '#8B0000' },
      // Lightning bolt emblem
      { d: 'M 108 70 L 90 110 L 102 110 L 92 140 L 112 98 L 100 98 Z', fill: '#FFD700' },
      // Bolt highlight
      { d: 'M 108 70 L 104 80 L 106 80 L 108 70 Z', fill: '#FFE860' },
      // Cape wave folds (shadow lines)
      { d: 'M 50 30 C 46 60 44 100 48 140', fill: 'none', stroke: '#AA0000', strokeWidth: 2 },
      { d: 'M 150 30 C 154 60 156 100 152 140', fill: 'none', stroke: '#AA0000', strokeWidth: 2 },
      { d: 'M 100 14 C 100 50 100 100 100 160', fill: 'none', stroke: '#AA0000', strokeWidth: 1.5 },
    ],
  },

  'royal-robe': {
    name: 'Royal Robe',
    width: 200,
    height: 200,
    paths: [
      // Robe main body (purple)
      { d: 'M 30 10 C 60 6 90 4 100 4 C 110 4 140 6 170 10 C 180 50 188 100 192 150 C 195 175 196 192 194 198 C 170 200 140 200 100 200 C 60 200 30 200 6 198 C 4 192 5 175 8 150 C 12 100 20 50 30 10 Z', fill: '#6B21A8' },
      // Ermine trim border (white)
      { d: 'M 30 10 C 24 14 18 20 12 30 L 8 50 C 18 44 28 16 30 10 Z', fill: '#F8F8F8' },
      { d: 'M 170 10 C 176 14 182 20 188 30 L 192 50 C 182 44 172 16 170 10 Z', fill: '#F8F8F8' },
      { d: 'M 8 150 C 8 160 8 174 8 184 C 20 192 40 198 60 198 L 60 188 C 40 186 22 180 8 150 Z', fill: '#F8F8F8' },
      { d: 'M 192 150 C 192 160 192 174 192 184 C 180 192 160 198 140 198 L 140 188 C 160 186 178 180 192 150 Z', fill: '#F8F8F8' },
      { d: 'M 60 198 L 60 188 L 140 188 L 140 198 Z', fill: '#F8F8F8' },
      // Ermine black spots
      { d: 'M 14 36 C 14 33 16 32 18 32 C 20 32 21 33 21 36 C 21 39 20 40 18 40 C 16 40 14 39 14 36 Z', fill: '#1a1a1a' },
      { d: 'M 22 26 C 22 23 24 22 26 22 C 28 22 29 23 29 26 C 29 29 28 30 26 30 C 24 30 22 29 22 26 Z', fill: '#1a1a1a' },
      { d: 'M 8 162 C 8 159 10 158 12 158 C 14 158 15 159 15 162 C 15 165 14 166 12 166 C 10 166 8 165 8 162 Z', fill: '#1a1a1a' },
      { d: 'M 12 178 C 12 175 14 174 16 174 C 18 174 19 175 19 178 C 19 181 18 182 16 182 C 14 182 12 181 12 178 Z', fill: '#1a1a1a' },
      { d: 'M 181 36 C 181 33 183 32 185 32 C 187 32 188 33 188 36 C 188 39 187 40 185 40 C 183 40 181 39 181 36 Z', fill: '#1a1a1a' },
      { d: 'M 171 26 C 171 23 173 22 175 22 C 177 22 178 23 178 26 C 178 29 177 30 175 30 C 173 30 171 29 171 26 Z', fill: '#1a1a1a' },
      { d: 'M 185 162 C 185 159 187 158 189 158 C 191 158 192 159 192 162 C 192 165 191 166 189 166 C 187 166 185 165 185 162 Z', fill: '#1a1a1a' },
      { d: 'M 181 178 C 181 175 183 174 185 174 C 187 174 188 175 188 178 C 188 181 187 182 185 182 C 183 182 181 181 181 178 Z', fill: '#1a1a1a' },
      // Gold trim line
      { d: 'M 30 10 C 60 6 90 4 100 4 C 110 4 140 6 170 10', fill: 'none', stroke: '#FFD700', strokeWidth: 3 },
      // Gold collar
      { d: 'M 60 10 C 70 6 82 4 100 4 C 118 4 130 6 140 10 L 136 24 C 124 18 114 14 100 14 C 86 14 76 18 64 24 Z', fill: '#FFD700' },
      // Robe shadow fold
      { d: 'M 100 4 L 100 200', fill: 'none', stroke: '#5a1090', strokeWidth: 3 },
      // Robe highlight
      { d: 'M 60 10 C 50 30 42 60 38 100 C 42 60 50 30 60 10 Z', fill: '#8B30C8' },
    ],
  },

  'wizard-cloak': {
    name: 'Wizard Cloak',
    width: 200,
    height: 200,
    paths: [
      // Cloak main (deep navy)
      { d: 'M 35 8 C 60 4 90 2 100 2 C 110 2 140 4 165 8 C 172 40 178 80 182 120 C 186 155 188 180 185 196 C 160 200 130 200 100 200 C 70 200 40 200 15 196 C 12 180 14 155 18 120 C 22 80 28 40 35 8 Z', fill: '#1a237e' },
      // Hood/collar
      { d: 'M 35 8 C 60 4 80 2 100 2 C 120 2 140 4 165 8 L 158 24 C 140 16 122 12 100 12 C 78 12 60 16 42 24 Z', fill: '#162060' },
      // Stars scattered on cloak
      { d: 'M 55 50 L 57 56 L 63 56 L 58 60 L 60 66 L 55 62 L 50 66 L 52 60 L 47 56 L 53 56 Z', fill: '#FFD700' },
      { d: 'M 140 40 L 142 46 L 148 46 L 143 50 L 145 56 L 140 52 L 135 56 L 137 50 L 132 46 L 138 46 Z', fill: '#FFD700' },
      { d: 'M 70 90 L 72 96 L 78 96 L 73 100 L 75 106 L 70 102 L 65 106 L 67 100 L 62 96 L 68 96 Z', fill: '#FFD700' },
      { d: 'M 130 100 L 132 106 L 138 106 L 133 110 L 135 116 L 130 112 L 125 116 L 127 110 L 122 106 L 128 106 Z', fill: '#FFD700' },
      { d: 'M 50 140 L 52 146 L 58 146 L 53 150 L 55 156 L 50 152 L 45 156 L 47 150 L 42 146 L 48 146 Z', fill: '#FFD700' },
      { d: 'M 148 150 L 150 156 L 156 156 L 151 160 L 153 166 L 148 162 L 143 166 L 145 160 L 140 156 L 146 156 Z', fill: '#FFD700' },
      // Small star sparkles
      { d: 'M 88 60 L 89 63 L 92 63 L 90 65 L 91 68 L 88 66 L 85 68 L 86 65 L 84 63 L 87 63 Z', fill: '#FFD700', opacity: 0.7 },
      { d: 'M 115 130 L 116 133 L 119 133 L 117 135 L 118 138 L 115 136 L 112 138 L 113 135 L 111 133 L 114 133 Z', fill: '#FFD700', opacity: 0.7 },
      // Moon symbol
      { d: 'M 96 168 C 92 164 90 158 92 152 C 86 156 84 164 88 170 C 92 176 100 178 106 174 C 100 176 94 174 96 168 Z', fill: '#C8A820' },
      // Cloak edge shadow
      { d: 'M 35 8 C 28 18 22 36 18 60 L 14 120 C 12 150 12 174 14 192 C 20 196 30 198 40 198 L 35 196 C 24 194 16 190 14 184 C 12 168 12 146 16 118 L 22 52 C 26 32 30 16 35 8 Z', fill: '#111540' },
      // Cloak highlight
      { d: 'M 165 8 C 172 18 178 36 182 60 L 186 120 C 188 150 188 174 186 192 C 180 196 170 198 160 198 L 165 196 C 176 194 184 190 186 184 C 188 168 188 146 184 118 L 178 52 C 174 32 170 16 165 8 Z', fill: '#2a3490' },
    ],
  },

  'vampire-cape': {
    name: 'Vampire Cape',
    width: 200,
    height: 200,
    paths: [
      // Cape outer (black)
      { d: 'M 40 4 C 65 2 90 2 100 2 C 110 2 135 2 160 4 C 168 30 176 70 184 114 C 190 148 192 175 188 196 C 168 200 136 200 100 200 C 64 200 32 200 12 196 C 8 175 10 148 16 114 C 24 70 32 30 40 4 Z', fill: '#1a1a1a' },
      // Inner lining (blood red) — visible on curled collar and edges
      { d: 'M 40 4 C 34 10 28 20 22 36 L 14 70 C 22 60 34 16 40 4 Z', fill: '#8B0000' },
      { d: 'M 160 4 C 166 10 172 20 178 36 L 186 70 C 178 60 166 16 160 4 Z', fill: '#8B0000' },
      // Bottom pointed scallops of cape
      { d: 'M 12 196 C 16 190 22 186 30 188 C 24 192 18 195 12 196 Z', fill: '#8B0000' },
      { d: 'M 188 196 C 184 190 178 186 170 188 C 176 192 182 195 188 196 Z', fill: '#8B0000' },
      // Dramatic upright collar (points up)
      { d: 'M 40 4 C 50 -2 64 -4 70 2 L 56 24 C 52 20 48 10 40 4 Z', fill: '#1a1a1a' },
      { d: 'M 160 4 C 150 -2 136 -4 130 2 L 144 24 C 148 20 152 10 160 4 Z', fill: '#1a1a1a' },
      // Collar inner red
      { d: 'M 70 2 L 56 24 C 60 22 70 14 70 2 Z', fill: '#8B0000' },
      { d: 'M 130 2 L 144 24 C 140 22 130 14 130 2 Z', fill: '#8B0000' },
      // Collar clasp/chain
      { d: 'M 70 2 C 78 -2 100 -2 130 2 L 128 6 C 110 2 90 2 72 6 Z', fill: '#C8A820' },
      { d: 'M 94 4 C 94 2 96 0 100 0 C 104 0 106 2 106 4 C 106 6 104 8 100 8 C 96 8 94 6 94 4 Z', fill: '#C8A820' },
      // Cape drape folds
      { d: 'M 100 4 L 96 200', fill: 'none', stroke: '#111111', strokeWidth: 2 },
      { d: 'M 100 4 L 104 200', fill: 'none', stroke: '#111111', strokeWidth: 2 },
      { d: 'M 70 6 C 62 40 52 90 44 148', fill: 'none', stroke: '#111111', strokeWidth: 1.5 },
      { d: 'M 130 6 C 138 40 148 90 156 148', fill: 'none', stroke: '#111111', strokeWidth: 1.5 },
      // Moonlight highlight along cape
      { d: 'M 40 4 C 32 24 24 56 18 100 C 24 60 32 24 40 4 Z', fill: '#333333' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // FOOTWEAR (width:160, height:100 each)
  // ─────────────────────────────────────────────────────────────

  'sneakers': {
    name: 'Sneakers',
    width: 160,
    height: 100,
    paths: [
      // LEFT SNEAKER
      // Sole
      { d: 'M 4 72 C 4 80 10 86 20 88 L 62 88 C 70 88 76 84 76 76 L 76 68 L 4 68 Z', fill: '#e0e0e0' },
      // Upper body
      { d: 'M 8 68 C 8 60 12 50 18 44 L 50 40 C 62 38 72 42 76 50 L 76 68 Z', fill: '#f8f8f8' },
      // Tongue
      { d: 'M 32 44 C 34 38 38 36 42 36 C 46 36 50 38 48 44 Z', fill: '#f0f0f0' },
      // Red stripe
      { d: 'M 14 58 C 20 54 34 52 50 54 L 54 58 C 38 56 22 58 14 62 Z', fill: '#DC143C' },
      // Laces
      { d: 'M 34 40 L 50 40 M 33 44 L 49 44 M 32 48 L 48 48', fill: 'none', stroke: '#ffffff', strokeWidth: 1.5 },
      // Toe cap
      { d: 'M 8 68 C 8 56 12 50 18 46 L 24 50 C 18 54 14 62 14 68 Z', fill: '#eeeeee' },

      // RIGHT SNEAKER
      // Sole
      { d: 'M 84 72 C 84 80 90 86 100 88 L 142 88 C 150 88 156 84 156 76 L 156 68 L 84 68 Z', fill: '#e0e0e0' },
      // Upper body
      { d: 'M 84 50 C 88 42 98 38 110 40 L 142 44 C 148 50 152 60 152 68 L 84 68 Z', fill: '#f8f8f8' },
      // Tongue
      { d: 'M 110 44 C 112 38 116 36 120 36 C 124 36 128 38 126 44 Z', fill: '#f0f0f0' },
      // Red stripe
      { d: 'M 106 54 C 122 52 136 54 142 58 L 146 62 C 138 58 122 56 106 58 Z', fill: '#DC143C' },
      // Laces
      { d: 'M 110 40 L 126 40 M 111 44 L 127 44 M 112 48 L 128 48', fill: 'none', stroke: '#ffffff', strokeWidth: 1.5 },
      // Toe cap
      { d: 'M 152 68 C 152 62 148 54 142 50 L 148 46 C 154 50 158 56 158 68 Z', fill: '#eeeeee' },
    ],
  },

  'cowboy-boots': {
    name: 'Cowboy Boots',
    width: 160,
    height: 100,
    paths: [
      // LEFT BOOT
      // Shaft (upper)
      { d: 'M 10 8 C 10 4 16 2 24 2 L 52 2 C 60 2 66 4 66 8 L 66 52 L 10 52 Z', fill: '#8B4513' },
      // Shaft toe stitching
      { d: 'M 16 10 C 20 8 28 6 36 6 C 44 6 52 8 56 10', fill: 'none', stroke: '#C8A820', strokeWidth: 1.5 },
      { d: 'M 14 18 C 18 16 28 14 36 14 C 44 14 54 16 58 18', fill: 'none', stroke: '#C8A820', strokeWidth: 1.5 },
      // Decorative stitching on shaft
      { d: 'M 20 28 C 24 24 32 22 36 22 C 40 22 48 24 52 28', fill: 'none', stroke: '#C8A820', strokeWidth: 1.5 },
      // Foot/vamp
      { d: 'M 10 52 L 10 72 C 10 78 14 82 22 84 L 60 84 C 68 84 72 80 72 74 L 72 52 Z', fill: '#8B4513' },
      // Toe cap
      { d: 'M 10 66 C 10 76 14 84 22 84 L 36 84 C 28 82 18 76 16 68 Z', fill: '#6B3410' },
      // Heel
      { d: 'M 56 80 C 56 86 60 90 66 90 L 72 90 L 72 74 L 58 74 Z', fill: '#5C2D0E' },
      // Sole
      { d: 'M 10 82 L 10 86 C 10 90 14 92 22 92 L 60 92 C 68 92 72 90 72 86 L 72 82 Z', fill: '#3a1a06' },

      // RIGHT BOOT
      { d: 'M 94 8 C 94 4 100 2 108 2 L 136 2 C 144 2 150 4 150 8 L 150 52 L 94 52 Z', fill: '#8B4513' },
      { d: 'M 100 10 C 104 8 112 6 120 6 C 128 6 136 8 140 10', fill: 'none', stroke: '#C8A820', strokeWidth: 1.5 },
      { d: 'M 98 18 C 102 16 112 14 120 14 C 128 14 138 16 142 18', fill: 'none', stroke: '#C8A820', strokeWidth: 1.5 },
      { d: 'M 104 28 C 108 24 116 22 120 22 C 124 22 132 24 136 28', fill: 'none', stroke: '#C8A820', strokeWidth: 1.5 },
      { d: 'M 88 52 L 88 74 C 88 80 92 84 100 84 L 140 84 C 148 84 152 80 152 72 L 152 52 Z', fill: '#8B4513' },
      { d: 'M 88 66 C 88 76 92 84 100 84 L 114 84 C 106 82 96 76 94 68 Z', fill: '#6B3410' },
      { d: 'M 136 80 C 136 86 140 90 146 90 L 152 90 L 152 74 L 138 74 Z', fill: '#5C2D0E' },
      { d: 'M 88 82 L 88 86 C 88 90 92 92 100 92 L 140 92 C 148 92 152 90 152 86 L 152 82 Z', fill: '#3a1a06' },
    ],
  },

  'sandals': {
    name: 'Sandals',
    width: 160,
    height: 100,
    paths: [
      // LEFT SANDAL
      // Sole
      { d: 'M 4 78 C 4 86 10 92 20 94 L 62 94 C 72 94 78 90 78 82 L 78 74 L 4 74 Z', fill: '#D2B48C' },
      // Sole edge
      { d: 'M 4 74 C 4 82 10 88 20 90 L 62 90 C 72 90 78 86 78 78 L 78 74 Z', fill: '#C8A870' },
      // Toe strap
      { d: 'M 18 74 C 18 68 22 64 28 62 L 50 62 C 56 62 60 66 60 72 L 60 74 Z', fill: '#C8A820' },
      // Ankle strap horizontal
      { d: 'M 10 56 C 14 52 22 50 32 50 L 62 50 C 68 52 72 54 72 58 L 72 64 C 68 60 62 58 50 58 L 28 58 C 18 58 12 60 10 64 Z', fill: '#C8A820' },
      // Ankle strap vertical left
      { d: 'M 10 56 L 10 74 L 16 74 L 16 54 Z', fill: '#B8960C' },
      // Buckle
      { d: 'M 66 50 C 66 46 68 44 70 44 C 72 44 74 46 74 50 C 74 52 72 54 70 54 C 68 54 66 52 66 50 Z', fill: '#8B6914' },
      { d: 'M 67 50 L 73 50', fill: 'none', stroke: '#C8A820', strokeWidth: 1.5 },

      // RIGHT SANDAL
      { d: 'M 82 78 C 82 86 88 92 98 94 L 140 94 C 150 94 156 90 156 82 L 156 74 L 82 74 Z', fill: '#D2B48C' },
      { d: 'M 82 74 C 82 82 88 88 98 90 L 140 90 C 150 90 156 86 156 78 L 156 74 Z', fill: '#C8A870' },
      { d: 'M 96 74 C 96 68 100 64 106 62 L 128 62 C 134 62 138 66 138 72 L 138 74 Z', fill: '#C8A820' },
      { d: 'M 88 56 C 92 52 100 50 110 50 L 140 50 C 146 52 150 54 150 58 L 150 64 C 146 60 140 58 128 58 L 106 58 C 96 58 90 60 88 64 Z', fill: '#C8A820' },
      { d: 'M 150 56 L 150 74 L 156 74 L 156 54 Z', fill: '#B8960C' },
      { d: 'M 84 50 C 84 46 86 44 88 44 C 90 44 92 46 92 50 C 92 52 90 54 88 54 C 86 54 84 52 84 50 Z', fill: '#8B6914' },
      { d: 'M 85 50 L 91 50', fill: 'none', stroke: '#C8A820', strokeWidth: 1.5 },
    ],
  },

  'flippers': {
    name: 'Flippers',
    width: 160,
    height: 100,
    paths: [
      // LEFT FLIPPER
      // Blade (long neon green blade)
      { d: 'M 6 40 C 4 50 2 64 4 76 C 6 84 12 90 20 92 L 46 92 C 52 90 56 86 56 80 C 56 70 52 56 48 44 C 44 34 38 28 32 26 C 26 24 20 26 14 32 C 10 36 8 38 6 40 Z', fill: '#00CC44' },
      // Blade shadow
      { d: 'M 6 40 C 4 50 2 64 4 76 C 6 84 12 90 20 92 L 14 90 C 8 86 4 78 2 68 C 0 58 2 48 6 40 Z', fill: '#009933' },
      // Blade highlight
      { d: 'M 22 30 C 26 28 32 28 36 32 C 30 30 24 30 22 30 Z', fill: '#44EE66' },
      // Foot pocket/strap
      { d: 'M 18 40 C 18 34 22 30 28 30 L 44 30 C 50 30 54 34 54 40 L 54 56 C 50 52 44 48 36 48 L 28 48 C 22 48 18 52 18 56 Z', fill: '#007722' },
      // Strap buckle
      { d: 'M 22 42 L 50 42 L 50 46 L 22 46 Z', fill: '#009933' },

      // RIGHT FLIPPER
      { d: 'M 154 40 C 156 50 158 64 156 76 C 154 84 148 90 140 92 L 114 92 C 108 90 104 86 104 80 C 104 70 108 56 112 44 C 116 34 122 28 128 26 C 134 24 140 26 146 32 C 150 36 152 38 154 40 Z', fill: '#00CC44' },
      { d: 'M 154 40 C 156 50 158 64 156 76 C 154 84 148 90 140 92 L 146 90 C 152 86 156 78 158 68 C 160 58 158 48 154 40 Z', fill: '#009933' },
      { d: 'M 138 30 C 134 28 128 28 124 32 C 130 30 136 30 138 30 Z', fill: '#44EE66' },
      { d: 'M 106 40 C 106 34 110 30 116 30 L 132 30 C 138 30 142 34 142 40 L 142 56 C 138 52 132 48 124 48 L 116 48 C 110 48 106 52 106 56 Z', fill: '#007722' },
      { d: 'M 110 42 L 138 42 L 138 46 L 110 46 Z', fill: '#009933' },
    ],
  },

  'roller-skates': {
    name: 'Roller Skates',
    width: 160,
    height: 100,
    paths: [
      // LEFT SKATE
      // Boot upper
      { d: 'M 8 30 C 8 20 14 14 24 12 L 52 12 C 62 12 68 18 68 28 L 68 60 L 8 60 Z', fill: '#f8f8f8' },
      // Boot tongue
      { d: 'M 30 14 C 32 10 36 8 40 8 C 44 8 48 10 46 14 Z', fill: '#eeeeee' },
      // Boot laces
      { d: 'M 32 12 L 48 12 M 31 18 L 47 18 M 30 24 L 46 24 M 29 30 L 45 30', fill: 'none', stroke: '#DC143C', strokeWidth: 2 },
      // Boot toe stop
      { d: 'M 8 50 C 4 52 2 56 4 60 C 6 62 10 62 12 60 Z', fill: '#FFD700' },
      // Boot plate (chassis)
      { d: 'M 8 60 L 8 68 L 68 68 L 68 60 Z', fill: '#e0e0e0' },
      // Wheels (pink, 4 wheels)
      { d: 'M 14 68 C 14 62 18 58 22 58 C 26 58 30 62 30 68 C 30 74 26 78 22 78 C 18 78 14 74 14 68 Z', fill: '#FF69B4' },
      { d: 'M 17 68 C 17 64 19 62 22 62 C 25 62 27 64 27 68 C 27 72 25 74 22 74 C 19 74 17 72 17 68 Z', fill: '#FF90C8' },
      { d: 'M 46 68 C 46 62 50 58 54 58 C 58 58 62 62 62 68 C 62 74 58 78 54 78 C 50 78 46 74 46 68 Z', fill: '#FF69B4' },
      { d: 'M 49 68 C 49 64 51 62 54 62 C 57 62 59 64 59 68 C 59 72 57 74 54 74 C 51 74 49 72 49 68 Z', fill: '#FF90C8' },

      // RIGHT SKATE
      { d: 'M 92 30 C 92 20 98 14 108 12 L 136 12 C 146 12 152 18 152 28 L 152 60 L 92 60 Z', fill: '#f8f8f8' },
      { d: 'M 114 14 C 116 10 120 8 124 8 C 128 8 132 10 130 14 Z', fill: '#eeeeee' },
      { d: 'M 116 12 L 132 12 M 115 18 L 131 18 M 114 24 L 130 24 M 113 30 L 129 30', fill: 'none', stroke: '#DC143C', strokeWidth: 2 },
      { d: 'M 152 50 C 156 52 158 56 156 60 C 154 62 150 62 148 60 Z', fill: '#FFD700' },
      { d: 'M 92 60 L 92 68 L 152 68 L 152 60 Z', fill: '#e0e0e0' },
      { d: 'M 98 68 C 98 62 102 58 106 58 C 110 58 114 62 114 68 C 114 74 110 78 106 78 C 102 78 98 74 98 68 Z', fill: '#FF69B4' },
      { d: 'M 101 68 C 101 64 103 62 106 62 C 109 62 111 64 111 68 C 111 72 109 74 106 74 C 103 74 101 72 101 68 Z', fill: '#FF90C8' },
      { d: 'M 130 68 C 130 62 134 58 138 58 C 142 58 146 62 146 68 C 146 74 142 78 138 78 C 134 78 130 74 130 68 Z', fill: '#FF69B4' },
      { d: 'M 133 68 C 133 64 135 62 138 62 C 141 62 143 64 143 68 C 143 72 141 74 138 74 C 135 74 133 72 133 68 Z', fill: '#FF90C8' },
    ],
  },

  'bunny-slippers': {
    name: 'Bunny Slippers',
    width: 160,
    height: 100,
    paths: [
      // LEFT SLIPPER
      // Slipper body
      { d: 'M 4 56 C 4 44 10 36 20 34 L 56 34 C 64 34 70 40 70 50 L 70 70 C 70 78 64 82 56 82 L 16 82 C 8 82 4 78 4 72 Z', fill: '#FFB6C1' },
      // Bunny face on toe
      { d: 'M 4 60 C 4 54 8 50 14 50 C 20 50 24 54 24 60 C 24 66 20 70 14 70 C 8 70 4 66 4 60 Z', fill: '#FFB6C1' },
      // Bunny ears (left ear)
      { d: 'M 8 50 C 6 42 8 28 12 18 C 14 24 14 36 12 50 Z', fill: '#FFB6C1' },
      { d: 'M 9 50 C 8 42 9 30 12 20 C 13 26 13 38 12 50 Z', fill: '#FF69B4' },
      // Bunny ears (right ear)
      { d: 'M 18 50 C 20 42 20 28 18 18 C 16 24 14 36 16 50 Z', fill: '#FFB6C1' },
      { d: 'M 17 50 C 18 42 18 30 17 20 C 16 26 15 38 16 50 Z', fill: '#FF69B4' },
      // Bunny eyes
      { d: 'M 8 58 C 8 56 10 55 11 55 C 12 55 13 56 13 58 C 13 60 12 61 11 61 C 10 61 8 60 8 58 Z', fill: '#1a1a1a' },
      { d: 'M 15 58 C 15 56 17 55 18 55 C 19 55 20 56 20 58 C 20 60 19 61 18 61 C 17 61 15 60 15 58 Z', fill: '#1a1a1a' },
      // Bunny nose
      { d: 'M 12 63 C 12 62 13 61 14 61 C 15 61 16 62 16 63 C 16 64 15 65 14 65 C 13 65 12 64 12 63 Z', fill: '#FF69B4' },
      // Slipper sole
      { d: 'M 4 72 L 4 78 C 4 82 10 86 20 86 L 56 86 C 66 86 70 82 70 78 L 70 72 Z', fill: '#FF9AAA' },

      // RIGHT SLIPPER
      { d: 'M 90 56 C 90 44 96 36 106 34 L 142 34 C 150 34 156 40 156 50 L 156 70 C 156 78 150 82 142 82 L 102 82 C 94 82 90 78 90 72 Z', fill: '#FFB6C1' },
      { d: 'M 136 60 C 136 54 140 50 146 50 C 152 50 156 54 156 60 C 156 66 152 70 146 70 C 140 70 136 66 136 60 Z', fill: '#FFB6C1' },
      // Right bunny ears
      { d: 'M 140 50 C 138 42 140 28 144 18 C 146 24 146 36 144 50 Z', fill: '#FFB6C1' },
      { d: 'M 141 50 C 140 42 141 30 144 20 C 145 26 145 38 144 50 Z', fill: '#FF69B4' },
      { d: 'M 150 50 C 152 42 152 28 150 18 C 148 24 146 36 148 50 Z', fill: '#FFB6C1' },
      { d: 'M 149 50 C 150 42 150 30 149 20 C 148 26 147 38 148 50 Z', fill: '#FF69B4' },
      // Right bunny eyes
      { d: 'M 140 58 C 140 56 142 55 143 55 C 144 55 145 56 145 58 C 145 60 144 61 143 61 C 142 61 140 60 140 58 Z', fill: '#1a1a1a' },
      { d: 'M 147 58 C 147 56 149 55 150 55 C 151 55 152 56 152 58 C 152 60 151 61 150 61 C 149 61 147 60 147 58 Z', fill: '#1a1a1a' },
      // Right bunny nose
      { d: 'M 144 63 C 144 62 145 61 146 61 C 147 61 148 62 148 63 C 148 64 147 65 146 65 C 145 65 144 64 144 63 Z', fill: '#FF69B4' },
      // Right slipper sole
      { d: 'M 90 72 L 90 78 C 90 82 96 86 106 86 L 142 86 C 152 86 156 82 156 78 L 156 72 Z', fill: '#FF9AAA' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // ACCESSORIES (width:100, height:160 each)
  // ─────────────────────────────────────────────────────────────

  'magic-wand': {
    name: 'Magic Wand',
    width: 100,
    height: 160,
    paths: [
      // Wand stick
      { d: 'M 44 60 C 42 64 40 80 38 100 C 36 120 34 140 32 154 C 36 156 40 157 44 156 C 46 142 48 122 50 102 C 52 82 54 66 56 60 Z', fill: '#8B4513' },
      // Wand stick highlight
      { d: 'M 46 62 C 44 78 42 98 40 118 C 42 98 44 76 46 62 Z', fill: '#A0522D' },
      // Gold star (5-point)
      { d: 'M 50 8 L 56 26 L 75 26 L 60 37 L 66 55 L 50 44 L 34 55 L 40 37 L 25 26 L 44 26 Z', fill: '#FFD700' },
      // Star shadow/depth
      { d: 'M 50 8 L 54 20 L 44 20 Z', fill: '#B8960C' },
      { d: 'M 50 44 L 46 34 L 56 34 Z', fill: '#B8960C' },
      // Star highlight
      { d: 'M 46 16 C 48 12 50 10 50 8 C 48 10 46 14 46 16 Z', fill: '#FFE860' },
      // Sparkle 1 (upper right)
      { d: 'M 72 14 L 74 18 L 78 18 L 75 21 L 77 25 L 72 22 L 67 25 L 69 21 L 66 18 L 70 18 Z', fill: '#FFD700', opacity: 0.8 },
      // Sparkle 2 (lower left)
      { d: 'M 22 34 L 24 38 L 28 38 L 25 41 L 27 45 L 22 42 L 17 45 L 19 41 L 16 38 L 20 38 Z', fill: '#FFD700', opacity: 0.8 },
      // Small sparkle dots
      { d: 'M 80 30 C 80 28 82 27 83 27 C 84 27 85 28 85 30 C 85 32 84 33 83 33 C 82 33 80 32 80 30 Z', fill: '#ffffff', opacity: 0.9 },
      { d: 'M 16 20 C 16 18 18 17 19 17 C 20 17 21 18 21 20 C 21 22 20 23 19 23 C 18 23 16 22 16 20 Z', fill: '#ffffff', opacity: 0.9 },
      { d: 'M 76 46 C 76 44 78 43 79 43 C 80 43 81 44 81 46 C 81 48 80 49 79 49 C 78 49 76 48 76 46 Z', fill: '#ffffff', opacity: 0.9 },
    ],
  },

  'shield': {
    name: 'Shield',
    width: 100,
    height: 160,
    paths: [
      // Shield main body
      { d: 'M 10 10 C 10 6 14 4 20 4 L 80 4 C 86 4 90 6 90 10 L 90 90 C 90 110 70 130 50 150 C 30 130 10 110 10 90 Z', fill: '#C0C0C0' },
      // Shield highlight (left)
      { d: 'M 10 10 C 10 6 14 4 20 4 L 26 4 C 20 6 16 10 16 14 L 16 90 C 16 108 28 126 40 140 C 26 126 10 108 10 90 Z', fill: '#D8D8D8' },
      // Shield shadow (right)
      { d: 'M 90 10 C 90 6 86 4 80 4 L 74 4 C 80 6 84 10 84 14 L 84 90 C 84 108 72 126 60 140 C 74 126 90 108 90 90 Z', fill: '#A8A8A8' },
      // Gold trim border
      { d: 'M 10 10 C 10 6 14 4 20 4 L 80 4 C 86 4 90 6 90 10 L 90 90 C 90 110 70 130 50 150 C 30 130 10 110 10 90 Z', fill: 'none', stroke: '#C8A820', strokeWidth: 4 },
      // Red cross vertical
      { d: 'M 42 16 L 42 134 C 44 140 46 146 50 150 C 54 146 56 140 58 134 L 58 16 Z', fill: '#DC143C' },
      // Red cross horizontal
      { d: 'M 12 56 L 12 72 L 88 72 L 88 56 Z', fill: '#DC143C' },
      // Cross highlight
      { d: 'M 42 16 L 44 16 L 44 134 L 42 134 Z', fill: '#EE2222' },
      { d: 'M 12 56 L 12 58 L 88 58 L 88 56 Z', fill: '#EE2222' },
      // Center boss (gold)
      { d: 'M 42 58 C 42 54 45 52 50 52 C 55 52 58 54 58 58 L 58 70 C 58 74 55 76 50 76 C 45 76 42 74 42 70 Z', fill: '#C8A820' },
      { d: 'M 44 60 C 44 57 46 55 50 55 C 48 56 45 58 44 60 Z', fill: '#E0C030' },
    ],
  },

  'boombox': {
    name: 'Boombox',
    width: 100,
    height: 160,
    paths: [
      // Main boombox body
      { d: 'M 6 30 C 6 24 10 20 16 20 L 84 20 C 90 20 94 24 94 30 L 94 130 C 94 136 90 140 84 140 L 16 140 C 10 140 6 136 6 130 Z', fill: '#1a1a1a' },
      // Body highlight
      { d: 'M 6 30 C 6 24 10 20 16 20 L 20 20 C 14 22 10 26 10 30 L 10 130 C 10 136 14 140 20 140 L 16 140 C 10 140 6 136 6 130 Z', fill: '#2a2a2a' },
      // Left speaker grille
      { d: 'M 12 36 C 12 32 14 30 18 30 L 40 30 C 44 30 46 32 46 36 L 46 80 C 46 84 44 86 40 86 L 18 86 C 14 86 12 84 12 80 Z', fill: '#333333' },
      // Left speaker cone
      { d: 'M 16 58 C 16 50 20 44 29 44 C 38 44 42 50 42 58 C 42 66 38 72 29 72 C 20 72 16 66 16 58 Z', fill: '#222222' },
      { d: 'M 20 58 C 20 52 24 48 29 48 C 34 48 38 52 38 58 C 38 64 34 68 29 68 C 24 68 20 64 20 58 Z', fill: '#1a1a1a' },
      { d: 'M 26 58 C 26 55 27 54 29 54 C 31 54 32 55 32 58 C 32 61 31 62 29 62 C 27 62 26 61 26 58 Z', fill: '#333333' },
      // Left speaker grille lines
      { d: 'M 12 40 L 46 40 M 12 44 L 46 44', fill: 'none', stroke: '#444444', strokeWidth: 1 },
      // Right speaker grille
      { d: 'M 54 36 C 54 32 56 30 60 30 L 88 30 C 92 30 94 32 94 36 L 94 80 C 94 84 92 86 88 86 L 60 86 C 56 86 54 84 54 80 Z', fill: '#333333' },
      // Right speaker cone
      { d: 'M 58 58 C 58 50 62 44 71 44 C 80 44 84 50 84 58 C 84 66 80 72 71 72 C 62 72 58 66 58 58 Z', fill: '#222222' },
      { d: 'M 62 58 C 62 52 66 48 71 48 C 76 48 80 52 80 58 C 80 64 76 68 71 68 C 66 68 62 64 62 58 Z', fill: '#1a1a1a' },
      { d: 'M 68 58 C 68 55 69 54 71 54 C 73 54 74 55 74 58 C 74 61 73 62 71 62 C 69 62 68 61 68 58 Z', fill: '#333333' },
      // Center control panel
      { d: 'M 20 92 L 20 128 L 80 128 L 80 92 Z', fill: '#252525' },
      // Red button
      { d: 'M 26 100 C 26 96 28 94 32 94 C 36 94 38 96 38 100 C 38 104 36 106 32 106 C 28 106 26 104 26 100 Z', fill: '#DC143C' },
      // Yellow button
      { d: 'M 44 100 C 44 96 46 94 50 94 C 54 94 56 96 56 100 C 56 104 54 106 50 106 C 46 106 44 104 44 100 Z', fill: '#FFD700' },
      // Green button
      { d: 'M 62 100 C 62 96 64 94 68 94 C 72 94 74 96 74 100 C 74 104 72 106 68 106 C 64 106 62 104 62 100 Z', fill: '#00CC44' },
      // Volume slider
      { d: 'M 26 116 L 74 116 L 74 120 L 26 120 Z', fill: '#444444' },
      { d: 'M 44 112 L 44 124 L 50 124 L 50 112 Z', fill: '#DC143C' },
      // Antenna
      { d: 'M 74 20 L 80 2', fill: 'none', stroke: '#555555', strokeWidth: 3 },
      { d: 'M 80 2 C 80 0 82 0 83 1 C 82 1 81 2 80 2 Z', fill: '#888888' },
      // Handle
      { d: 'M 20 140 L 20 150 C 20 154 26 156 36 156 L 64 156 C 74 156 80 154 80 150 L 80 140 Z', fill: '#1a1a1a' },
      { d: 'M 32 144 C 32 140 36 138 50 138 C 64 138 68 140 68 144 L 68 150 C 68 146 64 144 50 144 C 36 144 32 146 32 150 Z', fill: '#333333' },
    ],
  },

  'umbrella': {
    name: 'Umbrella',
    width: 100,
    height: 160,
    paths: [
      // Canopy panels — alternating red and white
      // Red panel 1
      { d: 'M 50 20 C 50 20 26 24 12 44 C 22 42 34 38 50 38 Z', fill: '#DC143C' },
      // White panel 2
      { d: 'M 50 20 C 50 20 38 22 28 30 C 34 36 42 38 50 38 Z', fill: '#f8f8f8' },
      // Red panel 3
      { d: 'M 50 20 C 50 20 56 22 62 26 C 58 32 54 36 50 38 Z', fill: '#DC143C' },
      // White panel 4
      { d: 'M 50 20 C 50 20 66 26 76 36 C 68 38 60 38 50 38 Z', fill: '#f8f8f8' },
      // Red panel 5
      { d: 'M 50 20 C 50 20 80 32 88 48 C 78 46 64 42 50 38 Z', fill: '#DC143C' },
      // White panel 6
      { d: 'M 50 20 C 50 20 90 50 88 48 C 80 52 70 50 60 46 Z', fill: '#f8f8f8' },
      // Full canopy dome (overlay for shape)
      { d: 'M 12 44 C 14 30 28 18 50 16 C 72 18 86 30 88 44 C 78 40 66 38 50 38 C 34 38 22 40 12 44 Z', fill: 'none', stroke: '#DC143C', strokeWidth: 2 },
      // Canopy outer edge scallops
      { d: 'M 12 44 C 14 50 8 56 8 56 C 14 52 18 50 22 52 C 22 52 18 58 18 58 C 24 54 28 52 32 54 C 32 54 30 60 30 60 C 36 56 40 54 44 56 C 44 56 44 62 44 62 C 48 58 52 56 56 56 C 56 56 58 62 58 62 C 60 58 64 56 68 56 C 68 56 70 62 70 62 C 72 58 76 56 80 56 C 80 56 80 62 80 62 C 82 58 86 54 90 54 C 90 54 88 58 86 60 C 88 58 88 50 88 44', fill: 'none', stroke: '#CC0000', strokeWidth: 1 },
      // Shaft/pole
      { d: 'M 50 38 L 50 140', fill: 'none', stroke: '#8B4513', strokeWidth: 4 },
      // Crook handle
      { d: 'M 50 140 C 50 148 46 154 40 154 C 34 154 30 150 30 144 C 30 140 32 138 36 138', fill: 'none', stroke: '#8B4513', strokeWidth: 4 },
      // Pole tip
      { d: 'M 50 18 C 50 16 51 15 52 15 C 53 15 54 16 54 18 C 54 20 53 21 52 21 C 51 21 50 20 50 18 Z', fill: '#555555' },
    ],
  },

  'balloon': {
    name: 'Balloon',
    width: 100,
    height: 160,
    paths: [
      // Balloon body
      { d: 'M 14 52 C 14 28 28 10 50 10 C 72 10 86 28 86 52 C 86 76 72 94 50 94 C 28 94 14 76 14 52 Z', fill: '#DC143C' },
      // Balloon highlight
      { d: 'M 26 24 C 32 16 40 12 50 10 C 38 14 30 20 26 28 Z', fill: '#FF6666' },
      { d: 'M 22 40 C 24 34 28 28 34 24 C 28 30 24 36 22 40 Z', fill: '#FF8888' },
      // Balloon sheen
      { d: 'M 50 10 C 56 10 62 14 66 20 C 60 16 54 12 50 10 Z', fill: '#FF9999', opacity: 0.6 },
      // Balloon bottom shadow
      { d: 'M 38 84 C 38 90 42 94 50 94 C 58 94 62 90 62 84 C 62 90 58 96 50 96 C 42 96 38 90 38 84 Z', fill: '#AA0000' },
      // Knot
      { d: 'M 44 94 C 44 98 46 100 50 100 C 54 100 56 98 56 94 C 56 98 54 102 50 102 C 46 102 44 98 44 94 Z', fill: '#CC0000' },
      // String
      { d: 'M 50 102 C 48 112 52 126 46 140 C 50 128 48 114 50 102 Z', fill: '#8B4513' },
      { d: 'M 50 102 C 52 114 46 128 50 140 C 54 128 48 112 50 102 Z', fill: '#8B4513' },
      // String end
      { d: 'M 46 138 C 46 142 52 148 52 148 C 50 144 48 140 46 138 Z', fill: '#8B4513' },
    ],
  },

  'skateboard': {
    name: 'Skateboard',
    width: 100,
    height: 160,
    paths: [
      // Deck (maple wood color, held vertically)
      { d: 'M 24 8 C 20 8 14 12 12 18 L 12 138 C 14 144 20 148 26 148 L 74 148 C 80 148 86 144 88 138 L 88 18 C 86 12 80 8 76 8 Z', fill: '#D2691E' },
      // Wood grain lines
      { d: 'M 32 10 L 32 146', fill: 'none', stroke: '#C0601A', strokeWidth: 1 },
      { d: 'M 40 10 L 40 146', fill: 'none', stroke: '#C0601A', strokeWidth: 1 },
      { d: 'M 50 10 L 50 146', fill: 'none', stroke: '#C0601A', strokeWidth: 1 },
      { d: 'M 60 10 L 60 146', fill: 'none', stroke: '#C0601A', strokeWidth: 1 },
      { d: 'M 68 10 L 68 146', fill: 'none', stroke: '#C0601A', strokeWidth: 1 },
      // Grip tape (black top surface strip)
      { d: 'M 24 8 C 20 8 14 12 12 18 L 12 22 L 88 22 L 88 18 C 86 12 80 8 76 8 Z', fill: '#1a1a1a' },
      // Deck tail grip tape
      { d: 'M 12 138 C 14 144 20 148 26 148 L 74 148 C 80 148 86 144 88 138 L 88 134 L 12 134 Z', fill: '#1a1a1a' },
      // Trucks (silver bars)
      { d: 'M 8 30 C 6 30 4 32 4 34 L 4 42 C 4 44 6 46 8 46 L 92 46 C 94 46 96 44 96 42 L 96 34 C 96 32 94 30 92 30 Z', fill: '#C0C0C0' },
      { d: 'M 8 114 C 6 114 4 116 4 118 L 4 126 C 4 128 6 130 8 130 L 92 130 C 94 130 96 128 96 126 L 96 118 C 96 116 94 114 92 114 Z', fill: '#C0C0C0' },
      // Axle details
      { d: 'M 4 38 L 96 38', fill: 'none', stroke: '#A8A8A8', strokeWidth: 1.5 },
      { d: 'M 4 122 L 96 122', fill: 'none', stroke: '#A8A8A8', strokeWidth: 1.5 },
      // Wheels (red, x4)
      { d: 'M 2 34 C 2 28 6 24 12 24 C 18 24 22 28 22 34 C 22 40 18 44 12 44 C 6 44 2 40 2 34 Z', fill: '#DC143C' },
      { d: 'M 5 34 C 5 30 8 27 12 27 C 16 27 19 30 19 34 C 19 38 16 41 12 41 C 8 41 5 38 5 34 Z', fill: '#EE2222' },
      { d: 'M 78 34 C 78 28 82 24 88 24 C 94 24 98 28 98 34 C 98 40 94 44 88 44 C 82 44 78 40 78 34 Z', fill: '#DC143C' },
      { d: 'M 81 34 C 81 30 84 27 88 27 C 92 27 95 30 95 34 C 95 38 92 41 88 41 C 84 41 81 38 81 34 Z', fill: '#EE2222' },
      { d: 'M 2 118 C 2 112 6 108 12 108 C 18 108 22 112 22 118 C 22 124 18 128 12 128 C 6 128 2 124 2 118 Z', fill: '#DC143C' },
      { d: 'M 5 118 C 5 114 8 111 12 111 C 16 111 19 114 19 118 C 19 122 16 125 12 125 C 8 125 5 122 5 118 Z', fill: '#EE2222' },
      { d: 'M 78 118 C 78 112 82 108 88 108 C 94 108 98 112 98 118 C 98 124 94 128 88 128 C 82 128 78 124 78 118 Z', fill: '#DC143C' },
      { d: 'M 81 118 C 81 114 84 111 88 111 C 92 111 95 114 95 118 C 95 122 92 125 88 125 C 84 125 81 122 81 118 Z', fill: '#EE2222' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // TAIL FLAIR (width:120, height:120 each)
  // ─────────────────────────────────────────────────────────────

  'tail-ribbon': {
    name: 'Tail Ribbon',
    width: 120,
    height: 120,
    paths: [
      // Ribbon left loop
      { d: 'M 60 50 C 50 40 30 30 18 36 C 10 40 10 52 18 58 C 28 64 46 58 60 50 Z', fill: '#FF69B4' },
      // Left loop shadow
      { d: 'M 60 50 C 52 44 36 36 22 38 C 14 40 10 48 16 56 C 12 48 14 42 22 38 C 34 34 50 42 60 50 Z', fill: '#CC0066' },
      // Left loop highlight
      { d: 'M 24 38 C 32 34 44 38 52 44 C 44 40 32 36 24 38 Z', fill: '#FFB6C1' },
      // Ribbon right loop
      { d: 'M 60 50 C 70 40 90 30 102 36 C 110 40 110 52 102 58 C 92 64 74 58 60 50 Z', fill: '#FF69B4' },
      // Right loop shadow
      { d: 'M 60 50 C 68 44 84 36 98 38 C 106 40 110 48 104 56 C 108 48 106 42 98 38 C 86 34 70 42 60 50 Z', fill: '#CC0066' },
      // Right loop highlight
      { d: 'M 96 38 C 88 34 76 38 68 44 C 76 40 88 36 96 38 Z', fill: '#FFB6C1' },
      // Trailing ribbon ends (flowing down)
      { d: 'M 54 56 C 50 70 44 88 40 108 C 44 100 50 82 56 64 Z', fill: '#FF69B4' },
      { d: 'M 66 56 C 70 70 76 88 80 108 C 76 100 70 82 64 64 Z', fill: '#FF69B4' },
      // Trailing ribbon sheen
      { d: 'M 55 58 C 52 72 46 90 42 108 C 44 92 50 74 55 58 Z', fill: '#FFB6C1', opacity: 0.6 },
      { d: 'M 65 58 C 68 72 74 90 78 108 C 76 92 70 74 65 58 Z', fill: '#FFB6C1', opacity: 0.6 },
      // Center knot
      { d: 'M 52 46 C 52 42 55 40 60 40 C 65 40 68 42 68 46 L 68 54 C 68 58 65 60 60 60 C 55 60 52 58 52 54 Z', fill: '#CC0066' },
      { d: 'M 54 46 C 54 44 56 42 60 42 C 58 43 55 45 54 46 Z', fill: '#FF69B4' },
    ],
  },

  'jingle-bells': {
    name: 'Jingle Bells',
    width: 120,
    height: 120,
    paths: [
      // Red ribbon tying bells
      { d: 'M 20 22 C 40 14 80 14 100 22 L 100 30 C 80 22 40 22 20 30 Z', fill: '#DC143C' },
      // Bell 1 (left, larger)
      { d: 'M 14 28 C 14 22 18 18 26 18 C 34 18 38 22 38 28 L 44 72 C 44 80 38 86 28 88 C 18 86 12 80 12 72 Z', fill: '#FFD700' },
      // Bell 1 body shadow
      { d: 'M 14 28 C 14 22 18 18 26 18 C 20 22 16 28 16 36 L 12 72 C 12 80 16 86 22 88 C 16 84 12 78 12 72 Z', fill: '#B8960C' },
      // Bell 1 highlight
      { d: 'M 22 22 C 26 20 30 20 34 22 C 30 21 24 21 22 22 Z', fill: '#FFEC80' },
      // Bell 1 bottom opening
      { d: 'M 12 72 C 12 80 18 86 28 88 C 38 86 44 80 44 72 L 40 72 C 40 78 36 82 28 84 C 20 82 16 78 16 72 Z', fill: '#B8960C' },
      // Bell 1 slit (sound hole)
      { d: 'M 24 76 C 24 74 26 73 28 73 C 30 73 32 74 32 76 C 32 78 30 79 28 79 C 26 79 24 78 24 76 Z', fill: '#996600' },
      // Bell 2 (center, medium)
      { d: 'M 44 22 C 44 16 50 12 60 12 C 70 12 76 16 76 22 L 82 62 C 82 70 76 76 62 78 C 48 76 42 70 42 62 Z', fill: '#FFD700' },
      { d: 'M 44 22 C 44 16 50 12 60 12 C 52 16 46 22 46 30 L 42 62 C 42 70 46 76 52 78 C 46 74 42 68 42 62 Z', fill: '#B8960C' },
      { d: 'M 52 16 C 56 14 64 14 68 16 C 64 15 56 15 52 16 Z', fill: '#FFEC80' },
      { d: 'M 42 62 C 42 70 48 76 62 78 C 76 76 82 70 82 62 L 78 62 C 78 68 74 74 62 76 C 50 74 46 68 46 62 Z', fill: '#B8960C' },
      { d: 'M 56 66 C 56 64 58 63 60 63 C 62 63 64 64 64 66 C 64 68 62 69 60 69 C 58 69 56 68 56 66 Z', fill: '#996600' },
      // Bell 3 (right, medium)
      { d: 'M 76 28 C 76 22 82 18 90 18 C 98 18 104 22 104 28 L 110 68 C 110 76 104 82 90 84 C 76 82 70 76 70 68 Z', fill: '#FFD700' },
      { d: 'M 76 28 C 76 22 82 18 90 18 C 84 22 78 28 78 36 L 70 68 C 70 76 76 82 84 84 C 76 80 70 74 70 68 Z', fill: '#B8960C' },
      { d: 'M 84 22 C 88 20 94 20 98 22 C 94 21 86 21 84 22 Z', fill: '#FFEC80' },
      { d: 'M 70 68 C 70 76 76 82 90 84 C 104 82 110 76 110 68 L 106 68 C 106 74 100 80 90 82 C 80 80 74 74 74 68 Z', fill: '#B8960C' },
      { d: 'M 86 72 C 86 70 88 69 90 69 C 92 69 94 70 94 72 C 94 74 92 75 90 75 C 88 75 86 74 86 72 Z', fill: '#996600' },
    ],
  },

  'tail-bow': {
    name: 'Tail Bow',
    width: 120,
    height: 120,
    paths: [
      // Left bow wing
      { d: 'M 60 56 C 46 42 22 26 10 32 C 2 38 4 56 14 64 C 26 72 48 66 60 56 Z', fill: '#6B21A8' },
      // Left wing shadow
      { d: 'M 60 56 C 48 46 26 32 12 34 C 4 38 2 52 10 62 C 4 54 6 40 14 36 C 26 30 48 44 60 56 Z', fill: '#4B0082' },
      // Left wing sheen highlight
      { d: 'M 16 34 C 24 28 38 32 50 42 C 38 34 24 30 16 34 Z', fill: '#9370DB', opacity: 0.7 },
      // Right bow wing
      { d: 'M 60 56 C 74 42 98 26 110 32 C 118 38 116 56 106 64 C 94 72 72 66 60 56 Z', fill: '#6B21A8' },
      // Right wing shadow
      { d: 'M 60 56 C 72 46 94 32 108 34 C 116 38 118 52 110 62 C 116 54 114 40 106 36 C 94 30 72 44 60 56 Z', fill: '#4B0082' },
      // Right wing sheen
      { d: 'M 104 34 C 96 28 82 32 70 42 C 82 34 96 30 104 34 Z', fill: '#9370DB', opacity: 0.7 },
      // Flowing tails (down)
      { d: 'M 52 64 C 46 80 38 100 34 118 C 40 102 48 84 54 68 Z', fill: '#6B21A8' },
      { d: 'M 68 64 C 74 80 82 100 86 118 C 80 102 72 84 66 68 Z', fill: '#6B21A8' },
      // Tail sheen
      { d: 'M 54 66 C 50 82 42 102 38 118 C 42 104 50 82 54 66 Z', fill: '#9370DB', opacity: 0.5 },
      // Center knot
      { d: 'M 50 50 C 50 46 54 44 60 44 C 66 44 70 46 70 50 L 70 62 C 70 66 66 68 60 68 C 54 68 50 66 50 62 Z', fill: '#4B0082' },
      { d: 'M 52 50 C 52 48 54 46 60 46 C 58 47 54 50 52 52 Z', fill: '#6B21A8' },
      { d: 'M 60 44 C 62 44 64 46 66 48 C 64 46 62 44 60 44 Z', fill: '#9370DB', opacity: 0.5 },
    ],
  },

  'pennant-flag': {
    name: 'Pennant Flag',
    width: 120,
    height: 120,
    paths: [
      // Pole
      { d: 'M 18 4 C 18 2 21 1 24 1 C 27 1 30 2 30 4 L 30 116 C 30 118 27 119 24 119 C 21 119 18 118 18 116 Z', fill: '#8B4513' },
      // Pole highlight
      { d: 'M 20 4 L 20 116 C 20 118 22 119 24 119 L 22 119 C 20 118 18 116 18 116 L 18 4 C 18 2 20 1 22 1 Z', fill: '#A0522D' },
      // Gold tip
      { d: 'M 24 1 C 27 1 30 3 32 6 C 30 4 27 2 24 1 Z', fill: '#C8A820' },
      // Flag triangular pennant
      { d: 'M 30 10 L 110 36 L 30 62 Z', fill: '#DC143C' },
      // White stripe 1
      { d: 'M 30 10 L 110 36 L 30 14 Z', fill: '#ffffff' },
      // White stripe 2 (mid)
      { d: 'M 30 34 L 90 42 L 30 50 Z', fill: '#ffffff' },
      // White stripe 3 (near tip)
      { d: 'M 30 56 L 50 50 L 30 62 Z', fill: '#ffffff' },
      // Flag shadow/depth
      { d: 'M 30 10 C 30 16 30 22 30 30 L 30 62 L 36 62 L 36 10 Z', fill: '#BB0020' },
      // Flag wave ripple lines
      { d: 'M 50 18 C 54 24 54 30 50 36', fill: 'none', stroke: '#BB0020', strokeWidth: 1 },
      { d: 'M 70 26 C 74 32 74 38 70 44', fill: 'none', stroke: '#BB0020', strokeWidth: 1 },
      // Second small flag (decorative)
      { d: 'M 30 70 L 90 88 L 30 106 Z', fill: '#1E3A8A' },
      { d: 'M 30 70 L 90 88 L 30 74 Z', fill: '#ffffff' },
      { d: 'M 30 90 C 30 92 46 92 50 90 L 30 106 Z', fill: '#ffffff' },
    ],
  },

};