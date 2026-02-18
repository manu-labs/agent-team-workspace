// color-palettes.js
// Color palette definitions for dinosaurs and clothing items
// Used by the asset manifest and rendering system

/**
 * Dinosaur color palettes.
 * Keys match the slot fill references used in dino-paths.js:
 * body, belly, detail, dark, accent
 */
export const DINO_PALETTES = {
  trex: {
    body:   '#5a8a3c',
    belly:  '#a8d878',
    detail: '#3d6128',
    dark:   '#2e4a1e',
    accent: '#fffde0',
  },
  triceratops: {
    body:   '#5a4a8a',
    belly:  '#b0a0e8',
    detail: '#3d2e6e',
    dark:   '#2a1e50',
    accent: '#e8c84a',
  },
  stegosaurus: {
    body:   '#c87820',
    belly:  '#f0d080',
    detail: '#8a4a10',
    dark:   '#5a2e08',
    accent: '#e84a2a',
  },
};

/**
 * Clothing item color palettes.
 * Keys match item IDs in CLOTHING_PATHS and ASSET_MANIFEST.
 */
export const CLOTHING_PALETTES = {
  // ── HATS ──
  'top-hat':       { primary: '#1a1a1a', secondary: '#2a2a2a', accent: '#c8a820', dark: '#111111', light: '#ffffff' },
  'cowboy-hat':    { primary: '#8B4513', secondary: '#5C3317', accent: '#c8a820', dark: '#6B3410', light: '#9B5523' },
  'crown':         { primary: '#FFD700', secondary: '#B8960C', accent: '#DC143C', dark: '#8B6914', light: '#FFEC80', jewel: '#1E90FF' },
  'beanie':        { primary: '#CC2200', secondary: '#ffffff', accent: '#CC2200', dark: '#991100', light: '#ff4422' },
  'propeller-cap': { primary: '#4169E1', secondary: '#333333', accent: '#FF6B00', dark: '#2a4ab8', light: '#FFD700' },
  'chef-hat':      { primary: '#f8f8f8', secondary: '#e0e0e0', accent: '#cccccc', dark: '#aaaaaa', light: '#ffffff' },
  'pirate-hat':    { primary: '#1a1a1a', secondary: '#111111', accent: '#fffde0', dark: '#000000', light: '#fffde0' },
  'flower-crown':  { primary: '#228B22', secondary: '#1a6b1a', accent: '#FF69B4', dark: '#155215', light: '#FFD700', petal2: '#9370DB', petal3: '#ffffff' },

  // ── EYEWEAR ──
  'cool-shades':      { primary: '#1a1a1a', secondary: '#333333', accent: '#222222', dark: '#000000', light: '#444444', lens: 'rgba(0,0,0,0.85)' },
  'monocle':          { primary: '#C8A820', secondary: '#a08010', accent: '#8B0000', dark: '#806010', light: '#E0C040', lens: 'rgba(200,230,255,0.3)' },
  'star-glasses':     { primary: '#FF69B4', secondary: '#cc4490', accent: '#FFD700', dark: '#aa2270', light: '#FFB6C1', lens: '#FFD700' },
  'heart-glasses':    { primary: '#DC143C', secondary: '#aa1030', accent: '#FF69B4', dark: '#880020', light: '#FF6680', lens: '#FFB6C1' },
  'round-spectacles': { primary: '#8B6914', secondary: '#6B5010', accent: '#C8A820', dark: '#4a3808', light: '#B8900C', lens: 'rgba(220,240,220,0.2)' },
  'masquerade-mask':  { primary: '#6B21A8', secondary: '#4B0082', accent: '#FFD700', dark: '#3B0072', light: '#9370DB', feather: '#C8A820' },

  // ── NECKWEAR ──
  'bow-tie':        { primary: '#CC0000', secondary: '#990000', accent: '#ffffff', dark: '#770000', light: '#FF3333' },
  'scarf':          { primary: '#FF8C00', secondary: '#FF6B00', accent: '#FFD700', dark: '#CC6000', light: '#FFB347' },
  'necktie':        { primary: '#1E3A8A', secondary: '#0F1F50', accent: '#4169E1', dark: '#0a1030', light: '#2a50b0' },
  'bandana':        { primary: '#DC143C', secondary: '#8B0000', accent: '#ffffff', dark: '#660000', light: '#FF4466', pattern: '#990022' },
  'pearl-necklace': { primary: '#F8F0E3', secondary: '#D4C5B0', accent: '#C8A820', dark: '#B0A090', light: '#ffffff', clasp: '#C8A820' },
  'hawaiian-lei':   { primary: '#228B22', secondary: '#1a6b1a', accent: '#FF69B4', dark: '#155215', light: '#FFD700', petal2: '#FF8C00', petal3: '#9370DB' },

  // ── TOPS ──
  'vest':           { primary: '#8B4513', secondary: '#6B3410', accent: '#C8A820', dark: '#4a2208', light: '#9B5523', button: '#C8A820' },
  't-shirt':        { primary: '#f0f0f0', secondary: '#e0e0e0', accent: '#4169E1', dark: '#cccccc', light: '#ffffff' },
  'hawaiian-shirt': { primary: '#0066CC', secondary: '#004499', accent: '#FF69B4', dark: '#003377', light: '#3388DD', flower: '#FFD700', leaf: '#228B22' },
  'knight-armor':   { primary: '#C0C0C0', secondary: '#888888', accent: '#C8A820', dark: '#555555', light: '#E0E0E0', rivet: '#999999' },
  'sports-jersey':  { primary: '#DC143C', secondary: '#8B0000', accent: '#ffffff', dark: '#660000', light: '#FF4466', number: '#ffffff' },
  'suspenders':     { primary: '#DC143C', secondary: '#990000', accent: '#C8A820', dark: '#770000', light: '#FF4466', clip: '#C8A820' },

  // ── CAPES ──
  'superhero-cape': { primary: '#DC143C', secondary: '#8B0000', accent: '#FFD700', dark: '#660000', light: '#FF4466', bolt: '#FFD700' },
  'royal-robe':     { primary: '#6B21A8', secondary: '#4B0082', accent: '#FFD700', dark: '#3B0072', light: '#9370DB', ermine: '#F8F8F8', trim: '#FFD700' },
  'wizard-cloak':   { primary: '#1a237e', secondary: '#0d1450', accent: '#FFD700', dark: '#080c30', light: '#2a3a9e', star: '#FFD700', moon: '#C8A820' },
  'vampire-cape':   { primary: '#1a1a1a', secondary: '#111111', accent: '#8B0000', dark: '#000000', light: '#2a2a2a', lining: '#8B0000' },

  // ── FOOTWEAR ──
  'sneakers':      { primary: '#f8f8f8', secondary: '#e0e0e0', accent: '#DC143C', dark: '#cccccc', light: '#ffffff', sole: '#d0d0d0', stripe: '#DC143C' },
  'cowboy-boots':  { primary: '#8B4513', secondary: '#6B3410', accent: '#C8A820', dark: '#4a2208', light: '#9B5523', stitch: '#C8A820' },
  'sandals':       { primary: '#D2B48C', secondary: '#C8A820', accent: '#8B6914', dark: '#A0885A', light: '#E8D0A8', strap: '#C8A820' },
  'flippers':      { primary: '#00CC44', secondary: '#009933', accent: '#00FF55', dark: '#007722', light: '#44FF88', strap: '#008833' },
  'roller-skates': { primary: '#f8f8f8', secondary: '#e0e0e0', accent: '#FF69B4', dark: '#cccccc', light: '#ffffff', wheel: '#FF69B4', lace: '#DC143C' },
  'bunny-slippers':{ primary: '#FFB6C1', secondary: '#FF69B4', accent: '#FF69B4', dark: '#e090a0', light: '#FFD0D8', ear: '#FFB6C1', innerEar: '#FF69B4' },

  // ── ACCESSORIES ──
  'magic-wand': { primary: '#8B4513', secondary: '#6B3410', accent: '#FFD700', dark: '#4a2208', light: '#9B5523', star: '#FFD700', sparkle: '#ffffff' },
  'shield':     { primary: '#C0C0C0', secondary: '#888888', accent: '#DC143C', dark: '#555555', light: '#E0E0E0', cross: '#DC143C', trim: '#C8A820' },
  'boombox':    { primary: '#1a1a1a', secondary: '#333333', accent: '#DC143C', dark: '#000000', light: '#444444', speaker: '#222222', button: '#FFD700' },
  'umbrella':   { primary: '#DC143C', secondary: '#ffffff', accent: '#8B4513', dark: '#880000', light: '#FF4466', stripe2: '#1E90FF', handle: '#8B4513' },
  'balloon':    { primary: '#DC143C', secondary: '#CC0000', accent: '#FF6666', dark: '#990000', light: '#FF8888', string: '#8B4513', knot: '#BB0000' },
  'skateboard': { primary: '#D2691E', secondary: '#A0522D', accent: '#DC143C', dark: '#8B3A10', light: '#E8894E', wheel: '#DC143C', grip: '#1a1a1a', stripe: '#FFD700' },

  // ── TAIL FLAIR ──
  'tail-ribbon':   { primary: '#FF69B4', secondary: '#CC0066', accent: '#FFB6C1', dark: '#aa0050', light: '#FFD0E8', sheen: '#FFD0E8' },
  'jingle-bells':  { primary: '#FFD700', secondary: '#B8960C', accent: '#DC143C', dark: '#806010', light: '#FFEC80', highlight: '#FFF8A0', ribbon: '#DC143C' },
  'tail-bow':      { primary: '#6B21A8', secondary: '#4B0082', accent: '#9370DB', dark: '#3B0072', light: '#B090E8', sheen: '#C0A0FF' },
  'pennant-flag':  { primary: '#DC143C', secondary: '#8B0000', accent: '#ffffff', dark: '#660000', light: '#FF4466', stripe: '#ffffff', pole: '#8B4513' },
};