// color-palettes.js
// Color palettes for dinosaurs and clothing items

export const DINO_PALETTES = {
  trex: { body: '#5a8a3c', belly: '#a8d878', detail: '#3d6128', shadow: '#2e4a1e', accent: '#f5e642' },
  triceratops: { body: '#5a4a8a', belly: '#b0a0e8', detail: '#3d2e6e', shadow: '#2a1e50', accent: '#e8c84a' },
  stegosaurus: { body: '#c87820', belly: '#f0d080', detail: '#8a4a10', shadow: '#5a2e08', accent: '#e84a2a' },
};

export const CLOTHING_PALETTES = {
  // HATS
  'top-hat': { primary: '#1a1a1a', secondary: '#2a2a2a', accent: '#c8a820', dark: '#000000', light: '#ffffff' },
  'cowboy-hat': { primary: '#8b5e3c', secondary: '#c4956a', accent: '#d4a857', dark: '#5a3820', light: '#e8d0a8' },
  'crown': { primary: '#f5c842', secondary: '#e8a820', accent: '#e84a3a', dark: '#b88a10', light: '#fff5a0' },
  'beanie': { primary: '#e84a3a', secondary: '#c83020', accent: '#ffffff', dark: '#a02010', light: '#ffaaaa' },
  'propeller-cap': { primary: '#3a6ac8', secondary: '#2a50a0', accent: '#f5e642', dark: '#1a3070', light: '#a0c0f0' },
  'chef-hat': { primary: '#f8f8f8', secondary: '#e8e8e8', accent: '#d0d0d0', dark: '#888888', light: '#ffffff' },
  'pirate-hat': { primary: '#1a1a1a', secondary: '#2a2a2a', accent: '#ffffff', dark: '#000000', light: '#f8f8f8' },
  'flower-crown': { primary: '#e84a8a', secondary: '#48c848', accent: '#f5e642', dark: '#a02060', light: '#ff9abc' },

  // EYEWEAR
  'cool-shades': { primary: '#1a1a1a', secondary: '#2a2a2a', accent: '#888888', dark: '#000000', light: '#444444', lens: '#1a2a1a' },
  'monocle': { primary: '#c8a820', secondary: '#a88010', accent: '#88ccff', dark: '#5a4a00', light: '#ffe880', lens: '#d0eeff' },
  'star-glasses': { primary: '#ff69b4', secondary: '#ff1493', accent: '#ffff00', dark: '#c71585', light: '#ffb6c1', lens: '#ffe4e1' },
  'heart-glasses': { primary: '#e84a3a', secondary: '#c83020', accent: '#ff9090', dark: '#a02010', light: '#ffcccc', lens: '#ffd0d0' },
  'round-spectacles': { primary: '#8b5e3c', secondary: '#6a3e1c', accent: '#c8a820', dark: '#3a1e08', light: '#d0a870', lens: '#e8f0ff' },
  'masquerade-mask': { primary: '#6a2a8a', secondary: '#4a1a6a', accent: '#c8a820', dark: '#2a0a3a', light: '#c890f0', feather: '#ff69b4' },

  // NECKWEAR
  'bow-tie': { primary: '#e84a3a', secondary: '#c83020', accent: '#ffffff', dark: '#a02010', light: '#ff9090' },
  'scarf': { primary: '#f08030', secondary: '#e06010', accent: '#f5e642', dark: '#a05010', light: '#ffc080' },
  'necktie': { primary: '#3a5ac8', secondary: '#2a4aaa', accent: '#6a8af0', dark: '#1a2a70', light: '#8090e0' },
  'bandana': { primary: '#e84a3a', secondary: '#c83020', accent: '#ffffff', dark: '#a02010', light: '#ff9090', pattern: '#ff6060' },
  'pearl-necklace': { primary: '#f8f0e8', secondary: '#e8d8c0', accent: '#c8a820', dark: '#a89060', light: '#ffffff', clasp: '#c8a820' },
  'hawaiian-lei': { primary: '#ff6b9d', secondary: '#48c848', accent: '#f5e642', dark: '#a02060', light: '#ff9abc', petal2: '#ff9030', petal3: '#a030f0' },

  // TOPS
  'vest': { primary: '#6b3a1e', secondary: '#8a4a28', accent: '#c8a820', dark: '#3a1e08', light: '#d4a060' },
  't-shirt': { primary: '#f8f8f8', secondary: '#e8e8e8', accent: '#3a6ac8', dark: '#888888', light: '#ffffff' },
  'hawaiian-shirt': { primary: '#2a90d0', secondary: '#1a70b0', accent: '#f08030', dark: '#0a4880', light: '#80d0ff', flower: '#e84a8a', leaf: '#48b848' },
  'knight-armor': { primary: '#c0c8d0', secondary: '#a0a8b0', accent: '#c8a820', dark: '#606870', light: '#f0f4f8' },
  'sports-jersey': { primary: '#e84a3a', secondary: '#c83020', accent: '#f8f8f8', dark: '#a02010', light: '#ff9090', number: '#ffffff' },
  'suspenders': { primary: '#e84a3a', secondary: '#c83020', accent: '#c8a820', dark: '#a02010', light: '#ff9090', clip: '#c8a820' },

  // CAPES
  'superhero-cape': { primary: '#e84a3a', secondary: '#c83020', accent: '#f5e642', dark: '#a02010', light: '#ff9090', bolt: '#f5e642' },
  'royal-robe': { primary: '#6a2a8a', secondary: '#4a1a6a', accent: '#c8a820', dark: '#2a0a3a', light: '#c890f0', ermine: '#f8f8f8', trim: '#c8a820' },
  'wizard-cloak': { primary: '#1a2a6a', secondary: '#0a1a4a', accent: '#f5e642', dark: '#0a0a2a', light: '#4a6ad0', star: '#f5e642', moon: '#c8d8ff' },
  'vampire-cape': { primary: '#1a1a1a', secondary: '#2a2a2a', accent: '#e84a3a', dark: '#000000', light: '#444444', lining: '#8a1a1a' },

  // FOOTWEAR
  'sneakers': { primary: '#f8f8f8', secondary: '#e8e8e8', accent: '#3a6ac8', dark: '#888888', light: '#ffffff', sole: '#dddddd', stripe: '#3a6ac8' },
  'cowboy-boots': { primary: '#6b3a1e', secondary: '#8a4a28', accent: '#c8a820', dark: '#3a1e08', light: '#d4a060', stitch: '#f5e642' },
  'sandals': { primary: '#c8a870', secondary: '#a88050', accent: '#8a6030', dark: '#5a3810', light: '#e8c890', strap: '#8a6030' },
  'flippers': { primary: '#48d848', secondary: '#28b828', accent: '#20a020', dark: '#108010', light: '#a0ffa0' },
  'roller-skates': { primary: '#f8f8f8', secondary: '#e8e8e8', accent: '#ff69b4', dark: '#888888', light: '#ffffff', wheel: '#ff69b4', lace: '#3a6ac8' },
  'bunny-slippers': { primary: '#ffb6c1', secondary: '#ff8a9a', accent: '#ff69b4', dark: '#c85070', light: '#ffe0e8', ear: '#f8e0e8', inner: '#ff9ab0' },

  // ACCESSORIES
  'magic-wand': { primary: '#6b3a1e', secondary: '#4a2010', accent: '#c8a820', dark: '#2a0800', light: '#d4a060', star: '#f5e642', sparkle: '#ffffff' },
  'shield': { primary: '#c0c8d0', secondary: '#a0a8b0', accent: '#e84a3a', dark: '#606870', light: '#f0f4f8', cross: '#e84a3a', trim: '#c8a820' },
  'boombox': { primary: '#1a1a1a', secondary: '#2a2a2a', accent: '#e84a3a', dark: '#000000', light: '#444444', speaker: '#333333', button: '#f5e642' },
  'umbrella': { primary: '#e84a3a', secondary: '#c83020', accent: '#f5e642', dark: '#a02010', light: '#ff9090', stripe2: '#3a6ac8', stripe3: '#48d848', handle: '#4a2010' },
  'balloon': { primary: '#e84a3a', secondary: '#c83020', accent: '#ff9090', dark: '#a02010', light: '#ff6060', string: '#888888', knot: '#a02010' },
  'skateboard': { primary: '#d4a060', secondary: '#b88040', accent: '#e84a3a', dark: '#5a3010', light: '#f0c880', wheel: '#333333', grip: '#1a1a1a', stripe: '#3a6ac8' },

  // TAIL FLAIR
  'tail-ribbon': { primary: '#ff69b4', secondary: '#ff1493', accent: '#ffffff', dark: '#c71585', light: '#ffb6c1', sheen: '#ffffff' },
  'jingle-bells': { primary: '#c8a820', secondary: '#a88010', accent: '#f5e642', dark: '#5a4a00', light: '#ffe880', highlight: '#ffffff', ribbon: '#e84a3a' },
  'tail-bow': { primary: '#9a30c8', secondary: '#7a1aa8', accent: '#c890f0', dark: '#3a0a50', light: '#d8a0ff', sheen: '#ffffff' },
  'pennant-flag': { primary: '#e84a3a', secondary: '#c83020', accent: '#f8f8f8', dark: '#a02010', light: '#ff9090', stripe: '#f8f8f8', pole: '#8b5e3c' },
};