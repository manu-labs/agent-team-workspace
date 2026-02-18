// asset-manifest.js
// Master registry mapping clothing item IDs to metadata

export const ASSET_MANIFEST = {
  clothing: {
    // HATS (slot: headTop, zIndex: 10)
    'top-hat': { name: 'Top Hat', category: 'hats', slot: 'headTop', zIndex: 10, scale: 1.0, offset: { x: 0, y: -55 } },
    'cowboy-hat': { name: 'Cowboy Hat', category: 'hats', slot: 'headTop', zIndex: 10, scale: 1.2, offset: { x: 0, y: -50 } },
    'crown': { name: 'Crown', category: 'hats', slot: 'headTop', zIndex: 10, scale: 0.9, offset: { x: 0, y: -42 } },
    'beanie': { name: 'Beanie', category: 'hats', slot: 'headTop', zIndex: 10, scale: 1.0, offset: { x: 0, y: -40 } },
    'propeller-cap': { name: 'Propeller Cap', category: 'hats', slot: 'headTop', zIndex: 10, scale: 0.95, offset: { x: 0, y: -48 } },
    'chef-hat': { name: 'Chef Hat', category: 'hats', slot: 'headTop', zIndex: 10, scale: 1.0, offset: { x: 0, y: -65 } },
    'pirate-hat': { name: 'Pirate Hat', category: 'hats', slot: 'headTop', zIndex: 10, scale: 1.1, offset: { x: 0, y: -48 } },
    'flower-crown': { name: 'Flower Crown', category: 'hats', slot: 'headTop', zIndex: 10, scale: 1.1, offset: { x: 0, y: -36 } },

    // EYEWEAR (slot: headEyes, zIndex: 11)
    'cool-shades': { name: 'Cool Shades', category: 'eyewear', slot: 'headEyes', zIndex: 11, scale: 1.0, offset: { x: 0, y: 0 } },
    'monocle': { name: 'Monocle', category: 'eyewear', slot: 'headEyes', zIndex: 11, scale: 0.8, offset: { x: 15, y: 5 } },
    'star-glasses': { name: 'Star Glasses', category: 'eyewear', slot: 'headEyes', zIndex: 11, scale: 1.0, offset: { x: 0, y: 0 } },
    'heart-glasses': { name: 'Heart Glasses', category: 'eyewear', slot: 'headEyes', zIndex: 11, scale: 1.0, offset: { x: 0, y: 0 } },
    'round-spectacles': { name: 'Round Spectacles', category: 'eyewear', slot: 'headEyes', zIndex: 11, scale: 1.0, offset: { x: 0, y: 0 } },
    'masquerade-mask': { name: 'Masquerade Mask', category: 'eyewear', slot: 'headEyes', zIndex: 11, scale: 1.2, offset: { x: 0, y: -5 } },

    // NECKWEAR (slot: neck, zIndex: 8)
    'bow-tie': { name: 'Bow Tie', category: 'neckwear', slot: 'neck', zIndex: 8, scale: 0.9, offset: { x: 0, y: 10 } },
    'scarf': { name: 'Scarf', category: 'neckwear', slot: 'neck', zIndex: 8, scale: 1.1, offset: { x: 0, y: 5 } },
    'necktie': { name: 'Necktie', category: 'neckwear', slot: 'neck', zIndex: 8, scale: 1.0, offset: { x: 0, y: 8 } },
    'bandana': { name: 'Bandana', category: 'neckwear', slot: 'neck', zIndex: 8, scale: 1.0, offset: { x: 0, y: 5 } },
    'pearl-necklace': { name: 'Pearl Necklace', category: 'neckwear', slot: 'neck', zIndex: 8, scale: 1.0, offset: { x: 0, y: 8 } },
    'hawaiian-lei': { name: 'Hawaiian Lei', category: 'neckwear', slot: 'neck', zIndex: 8, scale: 1.1, offset: { x: 0, y: 10 } },

    // TOPS (slot: torsoFront, zIndex: 5)
    'vest': { name: 'Vest', category: 'tops', slot: 'torsoFront', zIndex: 5, scale: 1.1, offset: { x: 0, y: 0 } },
    't-shirt': { name: 'T-Shirt', category: 'tops', slot: 'torsoFront', zIndex: 5, scale: 1.2, offset: { x: 0, y: 0 } },
    'hawaiian-shirt': { name: 'Hawaiian Shirt', category: 'tops', slot: 'torsoFront', zIndex: 5, scale: 1.2, offset: { x: 0, y: 0 } },
    'knight-armor': { name: 'Knight Armor', category: 'tops', slot: 'torsoFront', zIndex: 5, scale: 1.1, offset: { x: 0, y: 0 } },
    'sports-jersey': { name: 'Sports Jersey', category: 'tops', slot: 'torsoFront', zIndex: 5, scale: 1.2, offset: { x: 0, y: 0 } },
    'suspenders': { name: 'Suspenders', category: 'tops', slot: 'torsoFront', zIndex: 5, scale: 1.2, offset: { x: 0, y: -10 } },

    // CAPES (slot: torsoBack, zIndex: 3)
    'superhero-cape': { name: 'Superhero Cape', category: 'capes', slot: 'torsoBack', zIndex: 3, scale: 1.4, offset: { x: 0, y: 0 } },
    'royal-robe': { name: 'Royal Robe', category: 'capes', slot: 'torsoBack', zIndex: 3, scale: 1.4, offset: { x: 0, y: 0 } },
    'wizard-cloak': { name: 'Wizard Cloak', category: 'capes', slot: 'torsoBack', zIndex: 3, scale: 1.3, offset: { x: 0, y: -5 } },
    'vampire-cape': { name: 'Vampire Cape', category: 'capes', slot: 'torsoBack', zIndex: 3, scale: 1.4, offset: { x: 0, y: 0 } },

    // FOOTWEAR (slot: leftFoot, zIndex: 6) — rendered on both feet
    'sneakers': { name: 'Sneakers', category: 'footwear', slot: 'leftFoot', zIndex: 6, scale: 1.0, offset: { x: 0, y: 0 }, mirrorRight: true },
    'cowboy-boots': { name: 'Cowboy Boots', category: 'footwear', slot: 'leftFoot', zIndex: 6, scale: 1.0, offset: { x: 0, y: 0 }, mirrorRight: true },
    'sandals': { name: 'Sandals', category: 'footwear', slot: 'leftFoot', zIndex: 6, scale: 1.0, offset: { x: 0, y: 0 }, mirrorRight: true },
    'flippers': { name: 'Flippers', category: 'footwear', slot: 'leftFoot', zIndex: 6, scale: 1.1, offset: { x: -10, y: 5 }, mirrorRight: true },
    'roller-skates': { name: 'Roller Skates', category: 'footwear', slot: 'leftFoot', zIndex: 6, scale: 1.0, offset: { x: 0, y: 5 }, mirrorRight: true },
    'bunny-slippers': { name: 'Bunny Slippers', category: 'footwear', slot: 'leftFoot', zIndex: 6, scale: 1.0, offset: { x: 0, y: 0 }, mirrorRight: true },

    // ACCESSORIES (slot: rightArm or leftArm, zIndex: 12)
    'magic-wand': { name: 'Magic Wand', category: 'accessories', slot: 'rightArm', zIndex: 12, scale: 0.9, offset: { x: 15, y: -20 } },
    'shield': { name: 'Shield', category: 'accessories', slot: 'leftArm', zIndex: 12, scale: 1.0, offset: { x: -15, y: -10 } },
    'boombox': { name: 'Boombox', category: 'accessories', slot: 'leftArm', zIndex: 12, scale: 1.0, offset: { x: -20, y: 0 } },
    'umbrella': { name: 'Umbrella', category: 'accessories', slot: 'rightArm', zIndex: 12, scale: 1.1, offset: { x: 10, y: -30 } },
    'balloon': { name: 'Balloon', category: 'accessories', slot: 'rightArm', zIndex: 12, scale: 1.0, offset: { x: 10, y: -60 } },
    'skateboard': { name: 'Skateboard', category: 'accessories', slot: 'leftFoot', zIndex: 4, scale: 1.2, offset: { x: 0, y: 10 } },

    // TAIL FLAIR (slot: tailTip, zIndex: 7)
    'tail-ribbon': { name: 'Tail Ribbon', category: 'tail-flair', slot: 'tailTip', zIndex: 7, scale: 0.9, offset: { x: 0, y: 0 } },
    'jingle-bells': { name: 'Jingle Bells', category: 'tail-flair', slot: 'tailTip', zIndex: 7, scale: 0.9, offset: { x: -5, y: 5 } },
    'tail-bow': { name: 'Tail Bow', category: 'tail-flair', slot: 'tailTip', zIndex: 7, scale: 1.0, offset: { x: 0, y: -5 } },
    'pennant-flag': { name: 'Pennant Flag', category: 'tail-flair', slot: 'tailTip', zIndex: 7, scale: 1.0, offset: { x: 10, y: -15 } },
  },

  categories: [
    { id: 'hats', label: 'Hats', icon: '🎩', order: 1 },
    { id: 'eyewear', label: 'Eyewear', icon: '👓', order: 2 },
    { id: 'neckwear', label: 'Neckwear', icon: '🎀', order: 3 },
    { id: 'tops', label: 'Tops', icon: '👕', order: 4 },
    { id: 'capes', label: 'Capes', icon: '🦸', order: 5 },
    { id: 'footwear', label: 'Footwear', icon: '👟', order: 6 },
    { id: 'accessories', label: 'Accessories', icon: '🪄', order: 7 },
    { id: 'tail-flair', label: 'Tail Flair', icon: '🎗️', order: 8 },
  ],

  dinosaurs: [
    { id: 'trex', name: 'Rex', subtitle: 'T-Rex', description: 'The king of the dinosaurs!', order: 1 },
    { id: 'triceratops', name: 'Cera', subtitle: 'Triceratops', description: 'Three horns are better than one!', order: 2 },
    { id: 'stegosaurus', name: 'Steggy', subtitle: 'Stegosaurus', description: 'Stylish plates for a stylish dino!', order: 3 },
  ],
};

// Helper: get all items in a category
export function getItemsByCategory(categoryId) {
  return Object.entries(ASSET_MANIFEST.clothing)
    .filter(([, item]) => item.category === categoryId)
    .map(([id, item]) => ({ id, ...item }));
}

// Helper: get item metadata by ID
export function getItemById(itemId) {
  return ASSET_MANIFEST.clothing[itemId] || null;
}