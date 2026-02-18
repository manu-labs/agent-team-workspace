// asset-manifest.js
// Master registry mapping clothing item IDs to metadata.
// Slot names must match keys in each dino's `slots` object in dino-paths.js.
// Z-index ranges from constants.js Z_RANGES:
//   BODY: 0-10, LOWER_CLOTHING: 11-20, UPPER_CLOTHING: 21-30, HEAD: 31-40, OVERLAYS: 41-50

export const ASSET_MANIFEST = {

  // ─────────────────────────────────────────────────────────────
  // CLOTHING ITEMS
  // ─────────────────────────────────────────────────────────────
  clothing: {

    // ── HATS (slot: headTop, zIndex: 35-38, HEAD range) ──
    'top-hat': {
      name: 'Top Hat',
      category: 'hats',
      slot: 'headTop',
      zIndex: 38,
      scale: 1.0,
      offset: { x: -70, y: -110 },   // centered above headTop slot
    },
    'cowboy-hat': {
      name: 'Cowboy Hat',
      category: 'hats',
      slot: 'headTop',
      zIndex: 38,
      scale: 1.1,
      offset: { x: -77, y: -100 },
    },
    'crown': {
      name: 'Crown',
      category: 'hats',
      slot: 'headTop',
      zIndex: 39,
      scale: 0.95,
      offset: { x: -67, y: -95 },
    },
    'beanie': {
      name: 'Beanie',
      category: 'hats',
      slot: 'headTop',
      zIndex: 37,
      scale: 1.0,
      offset: { x: -70, y: -90 },
    },
    'propeller-cap': {
      name: 'Propeller Cap',
      category: 'hats',
      slot: 'headTop',
      zIndex: 37,
      scale: 1.0,
      offset: { x: -70, y: -100 },
    },
    'chef-hat': {
      name: 'Chef Hat',
      category: 'hats',
      slot: 'headTop',
      zIndex: 38,
      scale: 1.0,
      offset: { x: -70, y: -110 },
    },
    'pirate-hat': {
      name: 'Pirate Hat',
      category: 'hats',
      slot: 'headTop',
      zIndex: 38,
      scale: 1.1,
      offset: { x: -77, y: -100 },
    },
    'flower-crown': {
      name: 'Flower Crown',
      category: 'hats',
      slot: 'headTop',
      zIndex: 36,
      scale: 1.0,
      offset: { x: -70, y: -80 },
    },

    // ── EYEWEAR (slot: headEyes, zIndex: 40, HEAD range) ──
    'cool-shades': {
      name: 'Cool Shades',
      category: 'eyewear',
      slot: 'headEyes',
      zIndex: 40,
      scale: 1.0,
      offset: { x: -65, y: -35 },
    },
    'monocle': {
      name: 'Monocle',
      category: 'eyewear',
      slot: 'headEyes',
      zIndex: 40,
      scale: 0.8,
      offset: { x: -20, y: -28 },
    },
    'star-glasses': {
      name: 'Star Glasses',
      category: 'eyewear',
      slot: 'headEyes',
      zIndex: 40,
      scale: 1.0,
      offset: { x: -65, y: -35 },
    },
    'heart-glasses': {
      name: 'Heart Glasses',
      category: 'eyewear',
      slot: 'headEyes',
      zIndex: 40,
      scale: 1.0,
      offset: { x: -65, y: -35 },
    },
    'round-spectacles': {
      name: 'Round Spectacles',
      category: 'eyewear',
      slot: 'headEyes',
      zIndex: 40,
      scale: 1.0,
      offset: { x: -65, y: -35 },
    },
    'masquerade-mask': {
      name: 'Masquerade Mask',
      category: 'eyewear',
      slot: 'headEyes',
      zIndex: 39,
      scale: 1.2,
      offset: { x: -78, y: -42 },
    },

    // ── NECKWEAR (slot: neck, zIndex: 20-22, LOWER_CLOTHING range) ──
    'bow-tie': {
      name: 'Bow Tie',
      category: 'neckwear',
      slot: 'neck',
      zIndex: 22,
      scale: 0.9,
      offset: { x: -58, y: -10 },
    },
    'scarf': {
      name: 'Scarf',
      category: 'neckwear',
      slot: 'neck',
      zIndex: 20,
      scale: 1.1,
      offset: { x: -71, y: -20 },
    },
    'necktie': {
      name: 'Necktie',
      category: 'neckwear',
      slot: 'neck',
      zIndex: 21,
      scale: 0.9,
      offset: { x: -58, y: -10 },
    },
    'bandana': {
      name: 'Bandana',
      category: 'neckwear',
      slot: 'neck',
      zIndex: 21,
      scale: 1.0,
      offset: { x: -65, y: -15 },
    },
    'pearl-necklace': {
      name: 'Pearl Necklace',
      category: 'neckwear',
      slot: 'neck',
      zIndex: 22,
      scale: 1.0,
      offset: { x: -65, y: -10 },
    },
    'hawaiian-lei': {
      name: 'Hawaiian Lei',
      category: 'neckwear',
      slot: 'neck',
      zIndex: 20,
      scale: 1.1,
      offset: { x: -71, y: -20 },
    },

    // ── TOPS (slot: torsoFront, zIndex: 13-16, LOWER_CLOTHING range) ──
    'vest': {
      name: 'Vest',
      category: 'tops',
      slot: 'torsoFront',
      zIndex: 15,
      scale: 1.1,
      offset: { x: -99, y: -80 },
    },
    't-shirt': {
      name: 'T-Shirt',
      category: 'tops',
      slot: 'torsoFront',
      zIndex: 14,
      scale: 1.1,
      offset: { x: -99, y: -80 },
    },
    'hawaiian-shirt': {
      name: 'Hawaiian Shirt',
      category: 'tops',
      slot: 'torsoFront',
      zIndex: 14,
      scale: 1.1,
      offset: { x: -99, y: -80 },
    },
    'knight-armor': {
      name: 'Knight Armor',
      category: 'tops',
      slot: 'torsoFront',
      zIndex: 16,
      scale: 1.2,
      offset: { x: -108, y: -88 },
    },
    'sports-jersey': {
      name: 'Sports Jersey',
      category: 'tops',
      slot: 'torsoFront',
      zIndex: 14,
      scale: 1.1,
      offset: { x: -99, y: -80 },
    },
    'suspenders': {
      name: 'Suspenders',
      category: 'tops',
      slot: 'torsoFront',
      zIndex: 16,
      scale: 1.1,
      offset: { x: -99, y: -80 },
    },

    // ── CAPES (slot: torsoBack, zIndex: 11-12, LOWER_CLOTHING range) ──
    'superhero-cape': {
      name: 'Superhero Cape',
      category: 'capes',
      slot: 'torsoBack',
      zIndex: 11,
      scale: 1.3,
      offset: { x: -130, y: -80 },
    },
    'royal-robe': {
      name: 'Royal Robe',
      category: 'capes',
      slot: 'torsoBack',
      zIndex: 11,
      scale: 1.4,
      offset: { x: -140, y: -90 },
    },
    'wizard-cloak': {
      name: 'Wizard Cloak',
      category: 'capes',
      slot: 'torsoBack',
      zIndex: 11,
      scale: 1.4,
      offset: { x: -140, y: -90 },
    },
    'vampire-cape': {
      name: 'Vampire Cape',
      category: 'capes',
      slot: 'torsoBack',
      zIndex: 11,
      scale: 1.4,
      offset: { x: -140, y: -90 },
    },

    // ── FOOTWEAR (slot: leftFoot / rightFoot, zIndex: 13, LOWER_CLOTHING range) ──
    'sneakers': {
      name: 'Sneakers',
      category: 'footwear',
      slot: 'leftFoot',
      slot2: 'rightFoot',
      zIndex: 13,
      scale: 1.0,
      offset: { x: -80, y: -50 },
    },
    'cowboy-boots': {
      name: 'Cowboy Boots',
      category: 'footwear',
      slot: 'leftFoot',
      slot2: 'rightFoot',
      zIndex: 13,
      scale: 1.0,
      offset: { x: -80, y: -50 },
    },
    'sandals': {
      name: 'Sandals',
      category: 'footwear',
      slot: 'leftFoot',
      slot2: 'rightFoot',
      zIndex: 13,
      scale: 1.0,
      offset: { x: -80, y: -50 },
    },
    'flippers': {
      name: 'Flippers',
      category: 'footwear',
      slot: 'leftFoot',
      slot2: 'rightFoot',
      zIndex: 13,
      scale: 1.1,
      offset: { x: -100, y: -45 },
    },
    'roller-skates': {
      name: 'Roller Skates',
      category: 'footwear',
      slot: 'leftFoot',
      slot2: 'rightFoot',
      zIndex: 13,
      scale: 1.0,
      offset: { x: -80, y: -50 },
    },
    'bunny-slippers': {
      name: 'Bunny Slippers',
      category: 'footwear',
      slot: 'leftFoot',
      slot2: 'rightFoot',
      zIndex: 13,
      scale: 1.0,
      offset: { x: -80, y: -50 },
    },

    // ── ACCESSORIES (slot: rightArm, zIndex: 41-43, OVERLAYS range) ──
    'magic-wand': {
      name: 'Magic Wand',
      category: 'accessories',
      slot: 'rightArm',
      zIndex: 43,
      scale: 0.9,
      offset: { x: -10, y: -130 },
    },
    'shield': {
      name: 'Shield',
      category: 'accessories',
      slot: 'leftArm',
      zIndex: 41,
      scale: 1.0,
      offset: { x: -50, y: -80 },
    },
    'boombox': {
      name: 'Boombox',
      category: 'accessories',
      slot: 'leftArm',
      zIndex: 42,
      scale: 0.9,
      offset: { x: -45, y: -100 },
    },
    'umbrella': {
      name: 'Umbrella',
      category: 'accessories',
      slot: 'rightArm',
      zIndex: 42,
      scale: 1.0,
      offset: { x: -10, y: -150 },
    },
    'balloon': {
      name: 'Balloon',
      category: 'accessories',
      slot: 'rightArm',
      zIndex: 43,
      scale: 1.0,
      offset: { x: -10, y: -180 },
    },
    'skateboard': {
      name: 'Skateboard',
      category: 'accessories',
      slot: 'leftFoot',
      zIndex: 12,
      scale: 1.1,
      offset: { x: -55, y: -20 },
    },

    // ── TAIL FLAIR (slot: tailTip, zIndex: 17-19, LOWER_CLOTHING range) ──
    'tail-ribbon': {
      name: 'Tail Ribbon',
      category: 'tail-flair',
      slot: 'tailTip',
      zIndex: 18,
      scale: 1.0,
      offset: { x: -60, y: -60 },
    },
    'jingle-bells': {
      name: 'Jingle Bells',
      category: 'tail-flair',
      slot: 'tailTip',
      zIndex: 18,
      scale: 1.0,
      offset: { x: -60, y: -60 },
    },
    'tail-bow': {
      name: 'Tail Bow',
      category: 'tail-flair',
      slot: 'tailTip',
      zIndex: 19,
      scale: 1.1,
      offset: { x: -66, y: -66 },
    },
    'pennant-flag': {
      name: 'Pennant Flag',
      category: 'tail-flair',
      slot: 'tailTip',
      zIndex: 17,
      scale: 1.0,
      offset: { x: -20, y: -100 },
    },
  },

  // ─────────────────────────────────────────────────────────────
  // CATEGORIES (display order for UI panel)
  // ─────────────────────────────────────────────────────────────
  categories: [
    { id: 'hats',        label: 'Hats',        icon: '🎩', order: 1 },
    { id: 'eyewear',     label: 'Eyewear',     icon: '👓', order: 2 },
    { id: 'neckwear',    label: 'Neckwear',    icon: '🎀', order: 3 },
    { id: 'tops',        label: 'Tops',        icon: '👕', order: 4 },
    { id: 'capes',       label: 'Capes',       icon: '🦸', order: 5 },
    { id: 'footwear',    label: 'Footwear',    icon: '👟', order: 6 },
    { id: 'accessories', label: 'Accessories', icon: '🪄', order: 7 },
    { id: 'tail-flair',  label: 'Tail Flair',  icon: '🎗️', order: 8 },
  ],

  // ─────────────────────────────────────────────────────────────
  // DINOSAURS
  // ─────────────────────────────────────────────────────────────
  dinosaurs: [
    { id: 'trex',        name: 'Rex',   subtitle: 'T-Rex',        order: 1 },
    { id: 'triceratops', name: 'Cera',  subtitle: 'Triceratops',  order: 2 },
    { id: 'stegosaurus', name: 'Steggy', subtitle: 'Stegosaurus', order: 3 },
  ],
};