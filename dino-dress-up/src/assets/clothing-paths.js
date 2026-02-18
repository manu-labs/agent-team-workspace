export const CLOTHING_PATHS = {

  // ─── HATS ────────────────────────────────────────────────────────────────

  'top-hat': {
    name: 'Top Hat',
    category: 'hats',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'brim',
        d: 'M30 140 Q30 155 100 155 Q170 155 170 140 Q170 128 100 128 Q30 128 30 140 Z',
        fill: 'primary',
      },
      {
        id: 'body',
        d: 'M55 128 L55 55 Q55 45 100 45 Q145 45 145 55 L145 128 Z',
        fill: 'primary',
      },
      {
        id: 'top',
        d: 'M55 55 Q55 40 100 40 Q145 40 145 55 Q145 62 100 62 Q55 62 55 55 Z',
        fill: 'dark',
      },
      {
        id: 'band',
        d: 'M55 115 L145 115 L145 125 L55 125 Z',
        fill: 'accent',
      },
    ],
  },

  'cowboy-hat': {
    name: 'Cowboy Hat',
    category: 'hats',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'brim',
        d: 'M10 120 Q10 138 55 138 Q60 145 100 145 Q140 145 145 138 Q190 138 190 120 Q190 108 165 108 Q155 115 100 115 Q45 115 35 108 Q10 108 10 120 Z',
        fill: 'primary',
      },
      {
        id: 'crown',
        d: 'M45 115 Q42 88 55 68 Q68 48 100 45 Q132 42 148 62 Q162 80 158 115 Z',
        fill: 'primary',
      },
      {
        id: 'dent',
        d: 'M62 80 Q75 68 100 65 Q125 62 140 78 Q132 72 100 70 Q68 68 62 80 Z',
        fill: 'dark',
      },
      {
        id: 'band',
        d: 'M48 112 Q48 105 100 103 Q152 101 153 108 Q153 115 100 117 Q47 119 48 112 Z',
        fill: 'accent',
      },
    ],
  },

  'crown': {
    name: 'Crown',
    category: 'hats',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'base',
        d: 'M30 155 L30 120 L170 120 L170 155 Q170 165 100 165 Q30 165 30 155 Z',
        fill: 'primary',
      },
      {
        id: 'points',
        d: 'M30 120 L30 155 L50 120 L65 75 L80 120 L100 60 L120 120 L135 75 L150 120 L170 155 L170 120 Z',
        fill: 'primary',
      },
      {
        id: 'rim',
        d: 'M30 120 Q100 112 170 120 L170 130 Q100 122 30 130 Z',
        fill: 'accent',
      },
      {
        id: 'jewels',
        d: 'M63 130 Q63 122 70 122 Q77 122 77 130 Q77 138 70 138 Q63 138 63 130 Z M92 130 Q92 122 100 122 Q108 122 108 130 Q108 138 100 138 Q92 138 92 130 Z M123 130 Q123 122 130 122 Q137 122 137 130 Q137 138 130 138 Q123 138 123 130 Z',
        fill: 'secondary',
      },
      {
        id: 'jewel-tops',
        d: 'M65 135 Q70 128 75 135 M94 135 Q100 128 106 135 M125 135 Q130 128 135 135',
        fill: 'light',
      },
    ],
  },

  'beanie': {
    name: 'Beanie',
    category: 'hats',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'body',
        d: 'M40 140 Q35 100 40 72 Q55 38 100 35 Q145 32 162 65 Q172 90 162 140 Z',
        fill: 'primary',
      },
      {
        id: 'ribbing',
        d: 'M40 140 Q100 132 162 140 L162 155 Q100 148 40 155 Z',
        fill: 'secondary',
      },
      {
        id: 'stripes',
        d: 'M43 95 Q100 88 158 95 M42 115 Q100 108 158 115',
        fill: 'accent',
      },
      {
        id: 'pompom',
        d: 'M82 35 Q82 12 100 12 Q118 12 118 30 Q118 50 100 52 Q82 50 82 35 Z',
        fill: 'accent',
      },
      {
        id: 'pompom-detail',
        d: 'M88 30 Q94 20 100 18 Q106 20 112 30 Q106 26 100 24 Q94 26 88 30 Z',
        fill: 'light',
      },
    ],
  },

  'propeller-cap': {
    name: 'Propeller Cap',
    category: 'hats',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'cap-body',
        d: 'M38 135 Q35 100 50 75 Q68 48 100 45 Q132 42 150 68 Q165 90 162 135 Z',
        fill: 'primary',
      },
      {
        id: 'cap-brim',
        d: 'M38 135 Q38 148 75 148 L130 135 Q145 148 162 135 Q162 148 100 152 Q38 152 38 135 Z',
        fill: 'secondary',
      },
      {
        id: 'cap-button',
        d: 'M90 45 Q90 35 100 35 Q110 35 110 45 Q110 55 100 55 Q90 55 90 45 Z',
        fill: 'dark',
      },
      {
        id: 'propeller',
        d: 'M100 40 Q85 25 68 30 Q75 40 100 42 Z M100 40 Q115 25 132 30 Q125 40 100 42 Z M100 40 Q85 55 68 50 Q75 40 100 38 Z M100 40 Q115 55 132 50 Q125 40 100 38 Z',
        fill: 'accent',
      },
      {
        id: 'panel-lines',
        d: 'M100 45 L68 135 M100 45 L132 135',
        fill: 'secondary',
      },
    ],
  },

  'chef-hat': {
    name: "Chef's Hat",
    category: 'hats',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'puff',
        d: 'M55 110 Q42 90 45 68 Q48 42 65 32 Q82 22 100 22 Q118 22 135 32 Q152 42 155 68 Q158 90 145 110 Z',
        fill: 'light',
      },
      {
        id: 'puff-shading',
        d: 'M55 110 Q48 90 50 70 Q52 52 65 40 Q55 60 56 80 Q57 100 62 110 Z M145 110 Q152 90 150 70 Q148 52 135 40 Q145 60 144 80 Q143 100 138 110 Z',
        fill: 'primary',
      },
      {
        id: 'band',
        d: 'M50 110 Q50 125 100 125 Q150 125 150 110 Q150 100 100 100 Q50 100 50 110 Z',
        fill: 'primary',
      },
      {
        id: 'band-stripe',
        d: 'M50 115 Q100 108 150 115 L150 122 Q100 118 50 122 Z',
        fill: 'light',
      },
    ],
  },

  'pirate-hat': {
    name: 'Pirate Hat',
    category: 'hats',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'brim',
        d: 'M15 130 Q15 148 55 145 Q75 142 100 140 Q125 138 148 142 Q185 148 185 130 Q185 118 155 118 Q130 120 100 122 Q70 124 45 120 Q15 118 15 130 Z',
        fill: 'primary',
      },
      {
        id: 'crown',
        d: 'M45 120 Q30 95 48 65 Q62 40 100 38 Q138 36 152 62 Q170 92 155 120 Z',
        fill: 'primary',
      },
      {
        id: 'skull',
        d: 'M82 80 Q82 65 100 62 Q118 59 118 74 Q118 88 108 92 L108 100 L92 100 L92 92 Q82 88 82 80 Z',
        fill: 'light',
      },
      {
        id: 'skull-eyes',
        d: 'M89 78 Q89 72 93 72 Q97 72 97 78 Q97 82 93 82 Q89 82 89 78 Z M103 78 Q103 72 107 72 Q111 72 111 78 Q111 82 107 82 Q103 82 103 78 Z',
        fill: 'dark',
      },
      {
        id: 'crossbones',
        d: 'M86 105 L114 105 M86 112 L114 112',
        fill: 'light',
      },
      {
        id: 'hat-band',
        d: 'M45 120 Q100 114 155 120 L155 128 Q100 122 45 128 Z',
        fill: 'accent',
      },
    ],
  },

  'flower-crown': {
    name: 'Flower Crown',
    category: 'hats',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'vine',
        d: 'M25 105 Q50 90 75 98 Q100 106 125 95 Q150 84 175 100',
        fill: 'secondary',
      },
      {
        id: 'leaves',
        d: 'M30 105 Q28 92 38 88 Q42 100 30 105 Z M60 98 Q58 85 68 82 Q72 94 60 98 Z M100 104 Q98 91 108 88 Q112 100 100 104 Z M140 96 Q138 83 148 80 Q152 92 140 96 Z M170 100 Q168 87 178 84 Q182 96 170 100 Z',
        fill: 'secondary',
      },
      {
        id: 'flowers-primary',
        d: 'M42 98 Q42 86 50 86 Q58 86 58 98 Q58 108 50 108 Q42 108 42 98 Z M88 104 Q88 92 96 92 Q104 92 104 104 Q104 114 96 114 Q88 114 88 104 Z M142 96 Q142 84 150 84 Q158 84 158 96 Q158 106 150 106 Q142 106 142 96 Z',
        fill: 'primary',
      },
      {
        id: 'flowers-accent',
        d: 'M118 100 Q118 90 126 90 Q134 90 134 100 Q134 110 126 110 Q118 110 118 100 Z M64 100 Q64 90 72 90 Q80 90 80 100 Q80 110 72 110 Q64 110 64 100 Z',
        fill: 'accent',
      },
      {
        id: 'flower-centers',
        d: 'M47 98 Q50 94 53 98 Q50 102 47 98 Z M93 104 Q96 100 99 104 Q96 108 93 104 Z M123 100 Q126 96 129 100 Q126 104 123 100 Z M147 96 Q150 92 153 96 Q150 100 147 96 Z M69 100 Q72 96 75 100 Q72 104 69 100 Z',
        fill: 'light',
      },
    ],
  },

  // ─── EYEWEAR ─────────────────────────────────────────────────────────────

  'cool-shades': {
    name: 'Cool Shades',
    category: 'eyewear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-lens',
        d: 'M18 88 Q18 68 40 65 Q62 62 68 80 Q74 95 62 108 Q48 118 35 112 Q18 105 18 88 Z',
        fill: 'primary',
      },
      {
        id: 'right-lens',
        d: 'M132 88 Q132 68 155 65 Q178 62 182 80 Q186 95 174 108 Q160 118 147 112 Q132 105 132 88 Z',
        fill: 'primary',
      },
      {
        id: 'frame',
        d: 'M18 88 Q18 68 40 65 L68 80 M68 80 Q74 95 62 108 Q48 118 35 112 Q18 105 18 88 Z M68 80 Q82 78 100 78 Q118 78 132 88 M132 88 Q132 68 155 65 L182 80 M182 80 Q186 95 174 108 Q160 118 147 112 Q132 105 132 88 Z M18 88 L5 78 M182 80 L195 75',
        fill: 'dark',
      },
      {
        id: 'lens-shine',
        d: 'M25 80 Q30 72 40 70 Q32 74 28 82 Z M139 80 Q144 72 154 70 Q146 74 142 82 Z',
        fill: 'light',
      },
      {
        id: 'bridge',
        d: 'M68 82 Q84 80 100 80 Q116 80 132 88 Q116 84 100 84 Q84 84 68 82 Z',
        fill: 'accent',
      },
    ],
  },

  'monocle': {
    name: 'Monocle',
    category: 'eyewear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'lens',
        d: 'M55 90 Q55 55 90 50 Q125 45 132 80 Q138 112 112 128 Q85 142 65 125 Q55 115 55 90 Z',
        fill: 'primary',
      },
      {
        id: 'frame',
        d: 'M52 90 Q52 50 90 46 Q128 42 136 80 Q142 115 114 132 Q84 148 62 128 Q48 115 52 90 Z M52 90 Q52 50 90 46 Q128 42 136 80 Q142 115 114 132 Q84 148 62 128 Q48 115 52 90 Z',
        fill: 'accent',
      },
      {
        id: 'lens-shine',
        d: 'M65 68 Q75 55 90 52 Q78 58 70 70 Z',
        fill: 'light',
      },
      {
        id: 'chain',
        d: 'M134 82 Q140 90 142 100 Q148 108 152 118 Q158 128 158 138 Q162 148 165 155',
        fill: 'accent',
      },
      {
        id: 'chain-links',
        d: 'M136 86 Q140 84 142 88 Q140 92 136 90 Z M144 102 Q148 100 150 104 Q148 108 144 106 Z M152 118 Q156 116 158 120 Q156 124 152 122 Z M159 135 Q163 133 165 137 Q163 141 159 139 Z',
        fill: 'secondary',
      },
    ],
  },

  'star-glasses': {
    name: 'Star Glasses',
    category: 'eyewear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-star',
        d: 'M55 100 L62 80 L68 100 L48 87 L72 87 Z',
        fill: 'primary',
      },
      {
        id: 'right-star',
        d: 'M145 100 L152 80 L158 100 L138 87 L162 87 Z',
        fill: 'primary',
      },
      {
        id: 'left-outline',
        d: 'M55 100 L62 80 L68 100 L48 87 L72 87 Z',
        fill: 'accent',
      },
      {
        id: 'right-outline',
        d: 'M145 100 L152 80 L158 100 L138 87 L162 87 Z',
        fill: 'accent',
      },
      {
        id: 'frames-and-bridge',
        d: 'M72 88 Q84 85 100 85 Q116 85 138 88 M5 82 L48 88 M162 88 L195 82',
        fill: 'dark',
      },
      {
        id: 'star-shine',
        d: 'M58 90 L62 82 L64 90 Z M148 90 L152 82 L154 90 Z',
        fill: 'light',
      },
    ],
  },

  'heart-glasses': {
    name: 'Heart Glasses',
    category: 'eyewear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-heart',
        d: 'M35 82 Q35 68 45 68 Q52 68 58 76 Q64 68 72 68 Q82 68 82 82 Q82 95 58 110 Q35 95 35 82 Z',
        fill: 'primary',
      },
      {
        id: 'right-heart',
        d: 'M118 82 Q118 68 128 68 Q135 68 141 76 Q147 68 155 68 Q165 68 165 82 Q165 95 141 110 Q118 95 118 82 Z',
        fill: 'primary',
      },
      {
        id: 'frames',
        d: 'M5 75 L35 80 M165 80 L195 75',
        fill: 'dark',
      },
      {
        id: 'bridge',
        d: 'M82 82 Q91 80 100 80 Q109 80 118 82 Q109 84 100 84 Q91 84 82 82 Z',
        fill: 'dark',
      },
      {
        id: 'heart-shine',
        d: 'M40 80 Q45 72 50 70 Q44 74 41 82 Z M123 80 Q128 72 133 70 Q127 74 124 82 Z',
        fill: 'light',
      },
    ],
  },

  'round-spectacles': {
    name: 'Round Spectacles',
    category: 'eyewear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-lens-fill',
        d: 'M18 90 Q18 65 42 62 Q66 59 70 82 Q74 105 52 115 Q28 120 18 100 Q14 96 18 90 Z',
        fill: 'light',
      },
      {
        id: 'right-lens-fill',
        d: 'M130 90 Q130 65 154 62 Q178 59 182 82 Q186 105 164 115 Q140 120 130 100 Q126 96 130 90 Z',
        fill: 'light',
      },
      {
        id: 'left-frame',
        d: 'M15 90 Q15 62 42 58 Q69 54 74 80 Q78 108 54 120 Q26 126 15 104 Q11 98 15 90 Z',
        fill: 'accent',
      },
      {
        id: 'right-frame',
        d: 'M127 90 Q127 62 154 58 Q181 54 186 80 Q190 108 166 120 Q138 126 127 104 Q123 98 127 90 Z',
        fill: 'accent',
      },
      {
        id: 'bridge-and-arms',
        d: 'M74 80 Q87 78 100 78 Q113 78 127 82 M15 80 L2 72 M186 80 L198 72',
        fill: 'dark',
      },
    ],
  },

  'masquerade-mask': {
    name: 'Masquerade Mask',
    category: 'eyewear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'mask-body',
        d: 'M10 90 Q10 65 40 58 Q62 53 75 65 Q88 55 100 55 Q112 55 125 65 Q138 53 160 58 Q190 65 190 90 Q190 115 160 118 Q140 120 125 108 Q112 118 100 118 Q88 118 75 108 Q60 120 40 118 Q10 115 10 90 Z',
        fill: 'primary',
      },
      {
        id: 'eye-holes',
        d: 'M32 85 Q32 70 52 68 Q72 66 75 80 Q72 92 52 94 Q32 96 32 85 Z M125 80 Q128 66 148 68 Q168 70 168 85 Q168 96 148 94 Q128 92 125 80 Z',
        fill: 'dark',
      },
      {
        id: 'ornate-top',
        d: 'M30 72 Q25 55 38 48 Q32 62 30 72 Z M75 65 Q72 48 85 40 Q80 54 75 65 Z M125 65 Q128 48 115 40 Q120 54 125 65 Z M170 72 Q175 55 162 48 Q168 62 170 72 Z M100 55 Q100 38 100 30 Q104 42 100 55 Z',
        fill: 'accent',
      },
      {
        id: 'filigree',
        d: 'M10 90 Q12 82 20 78 Q14 86 10 90 Z M190 90 Q188 82 180 78 Q186 86 190 90 Z M100 118 Q100 130 98 140 Q102 130 100 118 Z',
        fill: 'secondary',
      },
      {
        id: 'gems',
        d: 'M52 76 Q52 72 56 72 Q60 72 60 76 Q60 80 56 80 Q52 80 52 76 Z M144 76 Q144 72 148 72 Q152 72 152 76 Q152 80 148 80 Q144 80 144 76 Z M100 60 Q100 56 104 56 Q108 56 108 60 Q108 64 104 64 Q100 64 100 60 Z',
        fill: 'secondary',
      },
    ],
  },

  // ─── NECKWEAR ─────────────────────────────────────────────────────────────

  'bow-tie': {
    name: 'Bow Tie',
    category: 'neckwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-wing',
        d: 'M15 90 Q15 72 35 68 Q55 64 85 88 Q55 98 35 105 Q15 108 15 90 Z',
        fill: 'primary',
      },
      {
        id: 'right-wing',
        d: 'M185 90 Q185 72 165 68 Q145 64 115 88 Q145 98 165 105 Q185 108 185 90 Z',
        fill: 'primary',
      },
      {
        id: 'left-wing-shading',
        d: 'M20 90 Q22 78 38 74 Q28 82 25 92 Q22 100 38 104 Q25 100 20 90 Z',
        fill: 'secondary',
      },
      {
        id: 'right-wing-shading',
        d: 'M180 90 Q178 78 162 74 Q172 82 175 92 Q178 100 162 104 Q175 100 180 90 Z',
        fill: 'secondary',
      },
      {
        id: 'knot',
        d: 'M85 82 Q85 75 100 75 Q115 75 115 82 L115 98 Q115 105 100 105 Q85 105 85 98 Z',
        fill: 'accent',
      },
    ],
  },

  'scarf': {
    name: 'Scarf',
    category: 'neckwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'scarf-body',
        d: 'M42 65 Q48 55 100 52 Q152 49 158 65 Q162 78 155 85 Q145 95 100 98 Q55 101 42 88 Q35 78 42 65 Z',
        fill: 'primary',
      },
      {
        id: 'tail-left',
        d: 'M42 85 Q35 95 28 115 Q22 138 30 158 Q35 172 28 185 Q20 172 18 155 Q12 130 20 108 Q26 90 42 88 Z',
        fill: 'primary',
      },
      {
        id: 'tail-left-fringe',
        d: 'M28 185 Q24 192 26 198 M32 185 Q30 192 32 198 M36 184 Q35 192 38 198',
        fill: 'accent',
      },
      {
        id: 'stripe',
        d: 'M42 72 Q100 68 158 72 L158 80 Q100 76 42 80 Z M42 80 Q100 76 158 80 L158 88 Q100 84 42 88 Z',
        fill: 'secondary',
      },
      {
        id: 'stripe-accent',
        d: 'M42 76 Q100 72 158 76 L158 80 Q100 76 42 80 Z',
        fill: 'accent',
      },
    ],
  },

  'necktie': {
    name: 'Necktie',
    category: 'neckwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'knot',
        d: 'M80 45 Q80 35 100 35 Q120 35 120 45 L115 65 Q108 72 100 72 Q92 72 85 65 Z',
        fill: 'primary',
      },
      {
        id: 'body',
        d: 'M85 65 Q88 68 100 70 Q112 68 115 65 L125 120 Q118 140 100 150 Q82 140 75 120 Z',
        fill: 'primary',
      },
      {
        id: 'tip',
        d: 'M75 120 Q82 140 100 152 Q118 140 125 120 Q118 130 100 145 Q82 130 75 120 Z',
        fill: 'dark',
      },
      {
        id: 'stripe-1',
        d: 'M78 85 L122 85 Q120 90 100 92 Q80 90 78 85 Z',
        fill: 'accent',
      },
      {
        id: 'stripe-2',
        d: 'M77 105 L123 105 Q120 110 100 112 Q80 110 77 105 Z',
        fill: 'secondary',
      },
    ],
  },

  'bandana': {
    name: 'Bandana',
    category: 'neckwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'main-triangle',
        d: 'M30 55 Q100 48 170 55 L140 120 Q115 148 100 152 Q85 148 60 120 Z',
        fill: 'primary',
      },
      {
        id: 'back-flap',
        d: 'M30 55 Q20 60 15 72 Q20 65 30 65 Z M170 55 Q180 60 185 72 Q180 65 170 65 Z',
        fill: 'secondary',
      },
      {
        id: 'pattern-dots',
        d: 'M70 80 Q70 74 76 74 Q82 74 82 80 Q82 86 76 86 Q70 86 70 80 Z M94 95 Q94 89 100 89 Q106 89 106 95 Q106 101 100 101 Q94 101 94 95 Z M118 80 Q118 74 124 74 Q130 74 130 80 Q130 86 124 86 Q118 86 118 80 Z M82 112 Q82 106 88 106 Q94 106 94 112 Q94 118 88 118 Q82 118 82 112 Z M106 112 Q106 106 112 106 Q118 106 118 112 Q118 118 112 118 Q106 118 106 112 Z',
        fill: 'secondary',
      },
      {
        id: 'border',
        d: 'M30 55 Q100 48 170 55 Q100 52 30 55 Z M60 120 Q85 148 100 152 Q115 148 140 120',
        fill: 'accent',
      },
    ],
  },

  'pearl-necklace': {
    name: 'Pearl Necklace',
    category: 'neckwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'string',
        d: 'M30 68 Q50 58 100 55 Q150 52 170 68',
        fill: 'secondary',
      },
      {
        id: 'pearls',
        d: 'M30 68 Q30 60 36 60 Q42 60 42 68 Q42 76 36 76 Q30 76 30 68 Z M55 60 Q55 52 61 52 Q67 52 67 60 Q67 68 61 68 Q55 68 55 60 Z M82 56 Q82 48 88 48 Q94 48 94 56 Q94 64 88 64 Q82 64 82 56 Z M106 56 Q106 48 112 48 Q118 48 118 56 Q118 64 112 64 Q106 64 106 56 Z M133 60 Q133 52 139 52 Q145 52 145 60 Q145 68 139 68 Q133 68 133 60 Z M158 68 Q158 60 164 60 Q170 60 170 68 Q170 76 164 76 Q158 76 158 68 Z',
        fill: 'light',
      },
      {
        id: 'pearl-shine',
        d: 'M32 65 Q35 62 38 64 M57 57 Q60 54 63 56 M84 53 Q87 50 90 52 M108 53 Q111 50 114 52 M135 57 Q138 54 141 56 M160 65 Q163 62 166 64',
        fill: 'primary',
      },
      {
        id: 'clasp',
        d: 'M96 56 Q96 52 100 52 Q104 52 104 56 Q104 60 100 60 Q96 60 96 56 Z',
        fill: 'accent',
      },
    ],
  },

  'hawaiian-lei': {
    name: 'Hawaiian Lei',
    category: 'neckwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'string',
        d: 'M28 75 Q50 58 100 55 Q150 52 172 70',
        fill: 'secondary',
      },
      {
        id: 'flowers-1',
        d: 'M22 75 Q22 63 30 63 Q38 63 38 75 Q38 87 30 87 Q22 87 22 75 Z M60 60 Q60 48 68 48 Q76 48 76 60 Q76 72 68 72 Q60 72 60 60 Z M90 56 Q90 44 100 44 Q110 44 110 56 Q110 68 100 68 Q90 68 90 56 Z M124 60 Q124 48 132 48 Q140 48 140 60 Q140 72 132 72 Q124 72 124 60 Z M162 72 Q162 60 170 60 Q178 60 178 72 Q178 84 170 84 Q162 84 162 72 Z',
        fill: 'primary',
      },
      {
        id: 'flowers-2',
        d: 'M42 68 Q42 56 50 56 Q58 56 58 68 Q58 80 50 80 Q42 80 42 68 Z M78 58 Q78 46 86 46 Q94 46 94 58 Q94 70 86 70 Q78 70 78 58 Z M106 58 Q106 46 114 46 Q122 46 122 58 Q122 70 114 70 Q106 70 106 58 Z M142 65 Q142 53 150 53 Q158 53 158 65 Q158 77 150 77 Q142 77 142 65 Z',
        fill: 'accent',
      },
      {
        id: 'flower-centers',
        d: 'M27 75 Q30 71 33 75 Q30 79 27 75 Z M65 60 Q68 56 71 60 Q68 64 65 60 Z M95 56 Q100 52 105 56 Q100 60 95 56 Z M129 60 Q132 56 135 60 Q132 64 129 60 Z M167 72 Q170 68 173 72 Q170 76 167 72 Z M47 68 Q50 64 53 68 Q50 72 47 68 Z M83 58 Q86 54 89 58 Q86 62 83 58 Z M111 58 Q114 54 117 58 Q114 62 111 58 Z M147 65 Q150 61 153 65 Q150 69 147 65 Z',
        fill: 'light',
      },
    ],
  },

  // ─── TOPS ─────────────────────────────────────────────────────────────────

  'vest': {
    name: 'Vest',
    category: 'tops',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'body',
        d: 'M35 55 Q25 60 22 80 L18 165 Q20 178 35 180 L85 180 L85 130 Q85 118 100 115 Q115 118 115 130 L115 180 L165 180 Q180 178 182 165 L178 80 Q175 60 165 55 Q145 48 100 45 Q55 42 35 55 Z',
        fill: 'primary',
      },
      {
        id: 'lapels',
        d: 'M35 55 L65 80 L100 65 L65 80 Z M165 55 L135 80 L100 65 L135 80 Z',
        fill: 'light',
      },
      {
        id: 'pocket',
        d: 'M50 105 L80 105 L80 125 L50 125 Z',
        fill: 'secondary',
      },
      {
        id: 'buttons',
        d: 'M97 80 Q97 76 100 76 Q103 76 103 80 Q103 84 100 84 Q97 84 97 80 Z M97 98 Q97 94 100 94 Q103 94 103 98 Q103 102 100 102 Q97 102 97 98 Z M97 116 Q97 112 100 112 Q103 112 103 116 Q103 120 100 120 Q97 120 97 116 Z',
        fill: 'accent',
      },
      {
        id: 'collar',
        d: 'M35 55 Q55 48 100 45 Q145 42 165 55 Q145 50 100 50 Q55 54 35 55 Z',
        fill: 'secondary',
      },
    ],
  },

  't-shirt': {
    name: 'T-Shirt',
    category: 'tops',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'body',
        d: 'M55 65 L30 65 Q15 68 12 85 L18 125 Q20 135 35 132 L38 155 Q40 168 55 170 L145 170 Q160 168 162 155 L165 132 Q180 135 182 125 L188 85 Q185 68 170 65 L145 65 Q132 52 100 50 Q68 52 55 65 Z',
        fill: 'primary',
      },
      {
        id: 'collar',
        d: 'M68 52 Q68 42 100 40 Q132 38 132 52 Q132 62 100 64 Q68 66 68 52 Z',
        fill: 'secondary',
      },
      {
        id: 'sleeve-left',
        d: 'M55 65 L30 65 Q15 68 12 85 L18 125 Q20 135 35 132 Q38 118 38 100 L55 85 Z',
        fill: 'primary',
      },
      {
        id: 'sleeve-right',
        d: 'M145 65 L170 65 Q185 68 188 85 L182 125 Q180 135 165 132 Q162 118 162 100 L145 85 Z',
        fill: 'primary',
      },
      {
        id: 'design',
        d: 'M80 110 Q80 95 100 92 Q120 95 120 110 Q120 125 100 128 Q80 125 80 110 Z',
        fill: 'accent',
      },
    ],
  },

  'hawaiian-shirt': {
    name: 'Hawaiian Shirt',
    category: 'tops',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'body',
        d: 'M55 65 L30 65 Q15 68 12 85 L18 125 Q20 135 35 132 L38 165 Q40 178 55 180 L145 180 Q160 178 162 165 L165 132 Q180 135 182 125 L188 85 Q185 68 170 65 L145 65 Q132 52 100 50 Q68 52 55 65 Z',
        fill: 'primary',
      },
      {
        id: 'flowers',
        d: 'M45 90 Q45 80 52 80 Q59 80 59 90 Q59 100 52 100 Q45 100 45 90 Z M72 110 Q72 100 80 100 Q88 100 88 110 Q88 120 80 120 Q72 120 72 110 Z M112 95 Q112 85 120 85 Q128 85 128 95 Q128 105 120 105 Q112 105 112 95 Z M140 120 Q140 110 148 110 Q156 110 156 120 Q156 130 148 130 Q140 130 140 120 Z M55 140 Q55 130 62 130 Q69 130 69 140 Q69 150 62 150 Q55 150 55 140 Z M125 145 Q125 135 132 135 Q139 135 139 145 Q139 155 132 155 Q125 155 125 145 Z',
        fill: 'accent',
      },
      {
        id: 'flower-centers',
        d: 'M49 90 Q52 86 55 90 Q52 94 49 90 Z M76 110 Q80 106 84 110 Q80 114 76 110 Z M116 95 Q120 91 124 95 Q120 99 116 95 Z M144 120 Q148 116 152 120 Q148 124 144 120 Z M59 140 Q62 136 65 140 Q62 144 59 140 Z M129 145 Q132 141 135 145 Q132 149 129 145 Z',
        fill: 'light',
      },
      {
        id: 'collar',
        d: 'M68 52 L65 82 L100 68 L135 82 L132 52 Q116 46 100 44 Q84 42 68 52 Z',
        fill: 'secondary',
      },
      {
        id: 'buttons',
        d: 'M98 75 Q100 73 102 75 Q100 77 98 75 Z M98 92 Q100 90 102 92 Q100 94 98 92 Z M98 109 Q100 107 102 109 Q100 111 98 109 Z',
        fill: 'dark',
      },
    ],
  },

  'knight-armor': {
    name: 'Knight Armor',
    category: 'tops',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'chest-plate',
        d: 'M35 60 Q30 68 28 85 L28 165 Q30 178 50 180 L150 180 Q170 178 172 165 L172 85 Q170 68 165 60 Q145 48 100 45 Q55 42 35 60 Z',
        fill: 'primary',
      },
      {
        id: 'plate-lines',
        d: 'M40 100 L160 100 M40 120 L160 120 M40 140 L160 140 M100 60 L100 180',
        fill: 'dark',
      },
      {
        id: 'pauldrons',
        d: 'M28 85 Q18 78 15 95 Q18 112 30 112 Q28 100 28 85 Z M172 85 Q182 78 185 95 Q182 112 170 112 Q172 100 172 85 Z',
        fill: 'secondary',
      },
      {
        id: 'crest',
        d: 'M80 68 Q80 55 100 52 Q120 55 120 68 L115 85 Q108 90 100 90 Q92 90 85 85 Z',
        fill: 'accent',
      },
      {
        id: 'rivets',
        d: 'M45 110 Q45 106 48 106 Q51 106 51 110 Q51 114 48 114 Q45 114 45 110 Z M155 110 Q155 106 152 106 Q149 106 149 110 Q149 114 152 114 Q155 114 155 110 Z M45 130 Q45 126 48 126 Q51 126 51 130 Q51 134 48 134 Q45 134 45 130 Z M155 130 Q155 126 152 126 Q149 126 149 130 Q149 134 152 134 Q155 134 155 130 Z',
        fill: 'dark',
      },
    ],
  },

  'sports-jersey': {
    name: 'Sports Jersey',
    category: 'tops',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'body',
        d: 'M55 62 L30 62 Q15 66 12 85 L18 125 Q20 138 38 135 L42 180 Q44 188 60 188 L140 188 Q156 188 158 180 L162 135 Q180 138 182 125 L188 85 Q185 66 170 62 L145 62 Q130 48 100 45 Q70 42 55 62 Z',
        fill: 'primary',
      },
      {
        id: 'collar',
        d: 'M72 48 Q72 38 100 36 Q128 34 128 48 Q128 58 100 60 Q72 62 72 48 Z',
        fill: 'secondary',
      },
      {
        id: 'stripes',
        d: 'M38 135 L42 162 Q44 175 55 180 Q44 168 42 155 L38 128 Z M158 135 L162 155 Q160 168 145 180 Q156 175 158 162 L162 128 Z',
        fill: 'accent',
      },
      {
        id: 'number',
        d: 'M85 90 L85 145 M85 90 Q100 85 115 90 L115 115 Q100 120 85 115 M85 115 Q100 120 115 125 L115 145',
        fill: 'light',
      },
      {
        id: 'shoulder-stripe',
        d: 'M55 62 L55 90 Q42 85 30 80 Q15 75 12 85 Q18 72 30 68 L55 68 Z M145 62 L145 90 Q158 85 170 80 Q185 75 188 85 Q182 72 170 68 L145 68 Z',
        fill: 'secondary',
      },
    ],
  },

  'suspenders': {
    name: 'Suspenders',
    category: 'tops',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-strap',
        d: 'M65 30 Q62 32 60 38 L48 185 Q52 188 60 185 L72 38 Q72 32 68 30 Z',
        fill: 'primary',
      },
      {
        id: 'right-strap',
        d: 'M132 30 Q135 32 138 38 L150 185 Q146 188 138 185 L126 38 Q126 32 130 30 Z',
        fill: 'primary',
      },
      {
        id: 'crossbar',
        d: 'M56 100 Q56 95 100 92 Q144 89 144 94 L144 104 Q144 109 100 112 Q56 115 56 110 Z',
        fill: 'primary',
      },
      {
        id: 'left-clip',
        d: 'M56 178 Q50 182 48 188 Q52 192 60 190 Q68 188 68 182 Z',
        fill: 'accent',
      },
      {
        id: 'right-clip',
        d: 'M144 178 Q150 182 152 188 Q148 192 140 190 Q132 188 132 182 Z',
        fill: 'accent',
      },
    ],
  },

  // ─── CAPES ────────────────────────────────────────────────────────────────

  'superhero-cape': {
    name: 'Superhero Cape',
    category: 'capes',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'cape-body',
        d: 'M35 45 Q30 52 28 62 L18 185 Q30 195 55 185 Q75 175 100 195 Q125 175 145 185 Q170 195 182 185 L172 62 Q170 52 165 45 Q145 35 100 32 Q55 29 35 45 Z',
        fill: 'primary',
      },
      {
        id: 'cape-lining',
        d: 'M35 45 L38 60 L100 55 L162 60 L165 45 Q145 35 100 32 Q55 29 35 45 Z',
        fill: 'secondary',
      },
      {
        id: 'cape-interior',
        d: 'M40 62 L35 185 Q55 178 100 192 Q145 178 165 185 L160 62 Z',
        fill: 'secondary',
      },
      {
        id: 'emblem',
        d: 'M82 95 L100 72 L118 95 L110 95 L110 125 L90 125 L90 95 Z',
        fill: 'accent',
      },
      {
        id: 'clasp',
        d: 'M82 52 Q82 44 100 42 Q118 40 118 48 Q118 56 100 58 Q82 60 82 52 Z',
        fill: 'accent',
      },
    ],
  },

  'royal-robe': {
    name: 'Royal Robe',
    category: 'capes',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'robe-body',
        d: 'M30 50 Q22 60 20 78 L12 188 Q25 198 50 192 Q75 186 100 198 Q125 186 150 192 Q175 198 188 188 L180 78 Q178 60 170 50 Q145 38 100 35 Q55 32 30 50 Z',
        fill: 'primary',
      },
      {
        id: 'fur-trim',
        d: 'M30 50 L35 70 L100 62 L165 70 L170 50 Q145 38 100 35 Q55 32 30 50 Z M12 188 Q25 198 50 192 L50 175 Q25 182 14 175 Z M188 188 Q175 198 150 192 L150 175 Q175 182 186 175 Z',
        fill: 'light',
      },
      {
        id: 'fur-spots',
        d: 'M35 58 Q38 54 42 58 Q38 62 35 58 Z M48 62 Q52 58 56 62 Q52 66 48 62 Z M62 60 Q66 56 70 60 Q66 64 62 60 Z M78 64 Q82 60 86 64 Q82 68 78 64 Z M94 62 Q98 58 102 62 Q98 66 94 62 Z M110 64 Q114 60 118 64 Q114 68 110 64 Z M126 62 Q130 58 134 62 Q130 66 126 62 Z M142 60 Q146 56 150 60 Q146 64 142 60 Z M158 62 Q162 58 166 62 Q162 66 158 62 Z',
        fill: 'primary',
      },
      {
        id: 'pattern',
        d: 'M60 95 Q60 82 70 82 Q80 82 80 95 Q80 108 70 108 Q60 108 60 95 Z M90 115 Q90 102 100 102 Q110 102 110 115 Q110 128 100 128 Q90 128 90 115 Z M120 95 Q120 82 130 82 Q140 82 140 95 Q140 108 130 108 Q120 108 120 95 Z',
        fill: 'accent',
      },
    ],
  },

  'wizard-cloak': {
    name: 'Wizard Cloak',
    category: 'capes',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'cloak-body',
        d: 'M35 55 Q25 65 22 82 L15 192 Q30 200 60 192 Q80 185 100 198 Q120 185 140 192 Q170 200 185 192 L178 82 Q175 65 165 55 Q145 42 100 38 Q55 34 35 55 Z',
        fill: 'primary',
      },
      {
        id: 'hood',
        d: 'M35 55 Q30 35 50 22 Q72 10 100 8 Q128 6 150 18 Q170 30 165 55 Q145 42 100 38 Q55 34 35 55 Z',
        fill: 'primary',
      },
      {
        id: 'hood-lining',
        d: 'M38 55 Q42 38 60 26 Q78 16 100 14 Q122 12 140 24 Q158 34 162 52 Q145 40 100 40 Q55 44 38 55 Z',
        fill: 'dark',
      },
      {
        id: 'stars',
        d: 'M55 80 L58 72 L61 80 L53 75 L63 75 Z M145 105 L148 97 L151 105 L143 100 L153 100 Z M70 130 L73 122 L76 130 L68 125 L78 125 Z M130 145 L133 137 L136 145 L128 140 L138 140 Z M100 85 L104 75 L108 85 L98 79 L110 79 Z',
        fill: 'accent',
      },
      {
        id: 'clasp',
        d: 'M85 55 Q85 46 100 44 Q115 42 115 51 Q115 60 100 62 Q85 64 85 55 Z',
        fill: 'accent',
      },
    ],
  },

  'vampire-cape': {
    name: 'Vampire Cape',
    category: 'capes',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'cape-body',
        d: 'M32 50 Q25 60 22 78 L12 185 Q25 195 55 185 Q75 172 100 190 Q125 172 145 185 Q175 195 188 185 L178 78 Q175 60 168 50 Q145 38 100 35 Q55 32 32 50 Z',
        fill: 'dark',
      },
      {
        id: 'collar',
        d: 'M32 50 L48 75 L100 65 L152 75 L168 50 Q145 38 100 35 Q55 32 32 50 Z',
        fill: 'light',
      },
      {
        id: 'collar-points',
        d: 'M32 50 L42 65 L52 50 Q42 44 32 50 Z M148 50 L158 65 L168 50 Q158 44 148 50 Z',
        fill: 'light',
      },
      {
        id: 'cape-lining',
        d: 'M48 75 L44 185 Q55 182 70 175 L65 78 Z M152 75 L156 78 L135 175 Q145 182 156 185 L152 75 Z',
        fill: 'secondary',
      },
      {
        id: 'clasp',
        d: 'M87 58 Q87 50 100 48 Q113 46 113 54 Q113 62 100 64 Q87 66 87 58 Z',
        fill: 'accent',
      },
    ],
  },

  // ─── FOOTWEAR ─────────────────────────────────────────────────────────────

  'sneakers': {
    name: 'Sneakers',
    category: 'footwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-sole',
        d: 'M10 155 Q10 168 30 172 Q55 175 80 172 L80 158 Q55 162 30 158 Q15 155 10 155 Z',
        fill: 'dark',
      },
      {
        id: 'left-shoe',
        d: 'M15 120 Q12 135 10 155 Q20 158 40 158 Q60 158 78 155 L80 130 Q75 118 65 115 Q45 110 30 112 Q20 114 15 120 Z',
        fill: 'primary',
      },
      {
        id: 'left-toe',
        d: 'M78 140 Q82 130 88 128 Q95 125 98 132 Q100 140 88 148 Q80 152 78 145 Z',
        fill: 'primary',
      },
      {
        id: 'right-sole',
        d: 'M120 155 Q120 168 140 172 Q165 175 190 172 Q198 168 198 155 Q185 158 160 158 Q140 162 120 155 Z',
        fill: 'dark',
      },
      {
        id: 'right-shoe',
        d: 'M122 120 Q120 135 120 155 Q140 158 160 158 Q178 155 185 148 Q188 135 188 125 Q180 115 165 112 Q148 109 135 112 Q126 114 122 120 Z',
        fill: 'primary',
      },
      {
        id: 'laces',
        d: 'M25 130 L60 128 M28 138 L62 136 M32 120 L32 110 M45 120 L45 110 M58 120 L58 110 M130 130 L165 128 M133 138 L167 136 M137 120 L137 110 M150 120 L150 110 M163 120 L163 110',
        fill: 'light',
      },
    ],
  },

  'cowboy-boots': {
    name: 'Cowboy Boots',
    category: 'footwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-boot',
        d: 'M20 60 Q18 95 18 125 L18 160 Q18 172 35 175 Q52 178 68 170 L68 155 Q55 162 42 158 Q30 154 28 145 L28 120 L42 120 L42 60 Q35 55 20 60 Z',
        fill: 'primary',
      },
      {
        id: 'left-toe',
        d: 'M18 155 Q18 172 35 175 Q50 178 65 170 Q75 162 78 150 Q72 158 55 162 Q38 165 28 155 Z',
        fill: 'secondary',
      },
      {
        id: 'left-heel',
        d: 'M18 145 Q15 158 18 165 Q14 155 14 145 Z',
        fill: 'dark',
      },
      {
        id: 'right-boot',
        d: 'M115 60 Q115 95 115 125 L115 145 Q115 158 130 162 Q148 168 162 162 Q178 155 180 140 L172 140 Q170 152 158 156 Q145 160 135 155 Q125 150 125 140 L125 120 L158 120 L158 60 Q145 55 130 55 Q118 55 115 60 Z',
        fill: 'primary',
      },
      {
        id: 'right-toe',
        d: 'M115 145 Q115 162 130 168 Q148 175 165 168 Q178 160 182 148 Q172 162 155 165 Q138 168 125 158 Q118 152 115 145 Z',
        fill: 'secondary',
      },
      {
        id: 'boot-details',
        d: 'M22 80 Q35 76 42 78 M22 95 Q35 91 42 93 M118 80 Q132 76 155 78 M118 95 Q132 91 155 93',
        fill: 'accent',
      },
    ],
  },

  'sandals': {
    name: 'Sandals',
    category: 'footwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-sole',
        d: 'M8 148 Q8 162 28 168 Q48 174 72 168 Q88 162 88 150 Q88 138 72 132 Q48 126 28 132 Q8 138 8 148 Z',
        fill: 'secondary',
      },
      {
        id: 'left-straps',
        d: 'M20 132 Q28 118 48 115 Q65 112 72 120 Q60 118 48 120 Q32 124 20 132 Z M18 148 L35 130 Q38 126 42 128 Q38 132 35 138 Z M72 148 L55 130 Q52 126 48 128 Q52 132 55 138 Z M40 132 L40 110 Q44 105 48 108 L48 132 Z',
        fill: 'primary',
      },
      {
        id: 'right-sole',
        d: 'M112 148 Q112 162 132 168 Q152 174 176 168 Q192 162 192 150 Q192 138 176 132 Q152 126 132 132 Q112 138 112 148 Z',
        fill: 'secondary',
      },
      {
        id: 'right-straps',
        d: 'M124 132 Q132 118 152 115 Q169 112 176 120 Q164 118 152 120 Q136 124 124 132 Z M122 148 L139 130 Q142 126 146 128 Q142 132 139 138 Z M176 148 L159 130 Q156 126 152 128 Q156 132 159 138 Z M144 132 L144 110 Q148 105 152 108 L152 132 Z',
        fill: 'primary',
      },
    ],
  },

  'flippers': {
    name: 'Flippers',
    category: 'footwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-flipper',
        d: 'M10 130 Q8 155 15 168 Q25 182 45 188 Q65 192 80 182 Q95 170 92 148 Q88 128 70 118 Q50 108 30 115 Q15 120 10 130 Z',
        fill: 'primary',
      },
      {
        id: 'left-foot-pocket',
        d: 'M30 115 Q40 108 55 108 Q70 108 78 118 Q65 112 50 112 Q38 112 30 120 Z',
        fill: 'dark',
      },
      {
        id: 'left-ribs',
        d: 'M20 140 Q45 132 88 140 M15 152 Q42 144 90 152 M18 164 Q45 156 88 164',
        fill: 'secondary',
      },
      {
        id: 'right-flipper',
        d: 'M108 130 Q106 155 113 168 Q123 182 143 188 Q163 192 178 182 Q193 170 190 148 Q186 128 168 118 Q148 108 128 115 Q113 120 108 130 Z',
        fill: 'primary',
      },
      {
        id: 'right-foot-pocket',
        d: 'M128 115 Q138 108 153 108 Q168 108 176 118 Q163 112 148 112 Q136 112 128 120 Z',
        fill: 'dark',
      },
      {
        id: 'right-ribs',
        d: 'M118 140 Q143 132 186 140 M113 152 Q140 144 188 152 M116 164 Q143 156 186 164',
        fill: 'secondary',
      },
    ],
  },

  'roller-skates': {
    name: 'Roller Skates',
    category: 'footwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-boot',
        d: 'M12 100 Q10 120 10 140 Q10 155 25 160 Q42 165 62 160 Q78 155 80 140 L80 100 Q75 85 60 80 Q42 75 28 80 Q15 85 12 100 Z',
        fill: 'primary',
      },
      {
        id: 'left-frame',
        d: 'M12 155 L80 155 L80 170 Q80 178 46 178 Q12 178 12 170 Z',
        fill: 'dark',
      },
      {
        id: 'left-wheels',
        d: 'M18 170 Q18 160 24 160 Q30 160 30 170 Q30 180 24 180 Q18 180 18 170 Z M42 170 Q42 160 48 160 Q54 160 54 170 Q54 180 48 180 Q42 180 42 170 Z M62 170 Q62 160 68 160 Q74 160 74 170 Q74 180 68 180 Q62 180 62 170 Z',
        fill: 'accent',
      },
      {
        id: 'right-boot',
        d: 'M120 100 Q118 120 118 140 Q118 155 133 160 Q150 165 170 160 Q186 155 188 140 L188 100 Q183 85 168 80 Q150 75 136 80 Q123 85 120 100 Z',
        fill: 'primary',
      },
      {
        id: 'right-frame',
        d: 'M120 155 L188 155 L188 170 Q188 178 154 178 Q120 178 120 170 Z',
        fill: 'dark',
      },
      {
        id: 'right-wheels',
        d: 'M126 170 Q126 160 132 160 Q138 160 138 170 Q138 180 132 180 Q126 180 126 170 Z M150 170 Q150 160 156 160 Q162 160 162 170 Q162 180 156 180 Q150 180 150 170 Z M170 170 Q170 160 176 160 Q182 160 182 170 Q182 180 176 180 Q170 180 170 170 Z',
        fill: 'accent',
      },
      {
        id: 'laces',
        d: 'M18 108 L75 108 M20 118 L74 118 M22 128 L72 128 M126 108 L183 108 M128 118 L182 118 M130 128 L180 128',
        fill: 'light',
      },
    ],
  },

  'bunny-slippers': {
    name: 'Bunny Slippers',
    category: 'footwear',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-slipper',
        d: 'M8 145 Q8 162 28 168 Q50 174 72 168 Q88 160 88 148 Q88 135 72 128 Q50 122 28 128 Q8 135 8 145 Z',
        fill: 'primary',
      },
      {
        id: 'left-ears',
        d: 'M28 130 Q22 110 24 88 Q28 68 36 70 Q44 72 40 94 Q38 112 34 128 Z M55 128 Q52 108 54 86 Q58 66 66 68 Q74 70 70 92 Q66 114 62 128 Z',
        fill: 'light',
      },
      {
        id: 'left-inner-ears',
        d: 'M30 128 Q26 112 28 90 Q30 74 36 74 Q40 90 38 112 Z M57 126 Q55 110 56 88 Q60 72 66 72 Q68 88 66 112 Z',
        fill: 'secondary',
      },
      {
        id: 'left-face',
        d: 'M28 140 Q30 132 48 130 Q65 128 70 136 Q72 140 72 145 Q68 138 50 136 Q32 138 28 140 Z',
        fill: 'light',
      },
      {
        id: 'left-eyes-nose',
        d: 'M38 138 Q38 135 41 135 Q44 135 44 138 Q44 141 41 141 Q38 141 38 138 Z M55 138 Q55 135 58 135 Q61 135 61 138 Q61 141 58 141 Q55 141 55 138 Z M48 143 Q48 141 50 141 Q52 141 52 143 Q52 145 50 145 Q48 145 48 143 Z',
        fill: 'dark',
      },
      {
        id: 'right-slipper',
        d: 'M112 145 Q112 162 132 168 Q154 174 176 168 Q192 160 192 148 Q192 135 176 128 Q154 122 132 128 Q112 135 112 145 Z',
        fill: 'primary',
      },
      {
        id: 'right-ears',
        d: 'M132 130 Q126 110 128 88 Q132 68 140 70 Q148 72 144 94 Q142 112 138 128 Z M159 128 Q156 108 158 86 Q162 66 170 68 Q178 70 174 92 Q170 114 166 128 Z',
        fill: 'light',
      },
      {
        id: 'right-inner-ears',
        d: 'M134 128 Q130 112 132 90 Q134 74 140 74 Q144 90 142 112 Z M161 126 Q159 110 160 88 Q164 72 170 72 Q172 88 170 112 Z',
        fill: 'secondary',
      },
      {
        id: 'right-face',
        d: 'M132 140 Q134 132 152 130 Q169 128 174 136 Q176 140 176 145 Q172 138 154 136 Q136 138 132 140 Z',
        fill: 'light',
      },
      {
        id: 'right-eyes-nose',
        d: 'M142 138 Q142 135 145 135 Q148 135 148 138 Q148 141 145 141 Q142 141 142 138 Z M159 138 Q159 135 162 135 Q165 135 165 138 Q165 141 162 141 Q159 141 159 138 Z M152 143 Q152 141 154 141 Q156 141 156 143 Q156 145 154 145 Q152 145 152 143 Z',
        fill: 'dark',
      },
    ],
  },

  // ─── ACCESSORIES ──────────────────────────────────────────────────────────

  'magic-wand': {
    name: 'Magic Wand',
    category: 'accessories',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'stick',
        d: 'M155 35 Q160 30 165 35 L58 168 Q53 173 48 168 Q43 163 48 158 Z',
        fill: 'dark',
      },
      {
        id: 'star',
        d: 'M155 30 L160 12 L165 30 L148 18 L172 18 Z',
        fill: 'accent',
      },
      {
        id: 'star-outline',
        d: 'M155 30 L160 12 L165 30 L148 18 L172 18 Z',
        fill: 'primary',
      },
      {
        id: 'sparkles',
        d: 'M135 50 L138 42 L141 50 L133 45 L143 45 Z M178 55 L180 49 L182 55 L176 51 L184 51 Z M145 22 L147 16 L149 22 L143 18 L151 18 Z',
        fill: 'light',
      },
    ],
  },

  'shield': {
    name: 'Shield',
    category: 'accessories',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'shield-body',
        d: 'M30 30 Q30 20 100 18 Q170 16 170 30 L170 120 Q170 158 100 185 Q30 158 30 120 Z',
        fill: 'primary',
      },
      {
        id: 'shield-border',
        d: 'M38 35 Q38 28 100 26 Q162 24 162 35 L162 120 Q162 152 100 178 Q38 152 38 120 Z',
        fill: 'secondary',
      },
      {
        id: 'cross-bar',
        d: 'M92 30 L92 180 Q96 182 100 180 Q104 182 108 180 L108 30 Z M38 75 L162 75 L162 90 L38 90 Z',
        fill: 'accent',
      },
      {
        id: 'quadrants',
        d: 'M40 30 L90 30 L90 74 L40 74 Z M110 30 L160 30 L160 74 L110 74 Z M40 92 L90 92 L90 155 Q65 165 40 152 Z M110 92 L160 92 L160 152 Q135 165 110 155 Z',
        fill: 'light',
      },
      {
        id: 'boss',
        d: 'M85 82 Q85 72 100 70 Q115 68 115 78 Q115 88 100 90 Q85 92 85 82 Z',
        fill: 'accent',
      },
    ],
  },

  'boombox': {
    name: 'Boombox',
    category: 'accessories',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'body',
        d: 'M15 65 Q15 55 25 52 L175 52 Q185 55 185 65 L185 155 Q185 165 175 168 L25 168 Q15 165 15 155 Z',
        fill: 'primary',
      },
      {
        id: 'left-speaker',
        d: 'M22 70 Q22 62 35 60 Q48 58 55 65 Q62 72 58 85 Q52 98 38 100 Q22 100 22 85 Z',
        fill: 'dark',
      },
      {
        id: 'left-speaker-cone',
        d: 'M28 82 Q28 72 38 70 Q48 68 52 78 Q55 88 48 95 Q38 100 30 94 Q24 88 28 82 Z',
        fill: 'secondary',
      },
      {
        id: 'right-speaker',
        d: 'M145 70 Q145 62 158 60 Q171 58 178 65 Q185 72 181 85 Q175 98 161 100 Q145 100 145 85 Z',
        fill: 'dark',
      },
      {
        id: 'right-speaker-cone',
        d: 'M151 82 Q151 72 161 70 Q171 68 175 78 Q178 88 171 95 Q161 100 153 94 Q147 88 151 82 Z',
        fill: 'secondary',
      },
      {
        id: 'cassette',
        d: 'M75 65 L125 65 L125 100 L75 100 Z',
        fill: 'dark',
      },
      {
        id: 'cassette-reels',
        d: 'M83 75 Q83 68 90 68 Q97 68 97 75 Q97 82 90 82 Q83 82 83 75 Z M103 75 Q103 68 110 68 Q117 68 117 75 Q117 82 110 82 Q103 82 103 75 Z',
        fill: 'secondary',
      },
      {
        id: 'controls',
        d: 'M70 110 L130 110 L130 150 L70 150 Z M78 122 Q78 118 82 118 Q86 118 86 122 Q86 126 82 126 Q78 126 78 122 Z M95 122 Q95 118 99 118 Q103 118 103 122 Q103 126 99 126 Q95 126 95 122 Z M112 122 Q112 118 116 118 Q120 118 120 122 Q120 126 116 126 Q112 126 112 122 Z M78 138 L122 138 L122 143 L78 143 Z',
        fill: 'accent',
      },
      {
        id: 'handle',
        d: 'M55 52 Q55 38 65 35 Q75 32 75 42 L75 52 Z M145 52 Q145 38 135 35 Q125 32 125 42 L125 52 Z',
        fill: 'secondary',
      },
    ],
  },

  'umbrella': {
    name: 'Umbrella',
    category: 'accessories',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'canopy',
        d: 'M15 100 Q15 55 100 38 Q185 55 185 100 Q162 85 140 90 Q125 68 100 65 Q75 62 60 88 Q38 85 15 100 Z',
        fill: 'primary',
      },
      {
        id: 'canopy-panels',
        d: 'M15 100 Q38 85 60 88 Q55 70 68 58 Q50 65 35 80 Q22 90 15 100 Z M140 90 Q162 85 185 100 Q178 90 165 80 Q150 65 132 58 Q145 70 140 90 Z',
        fill: 'secondary',
      },
      {
        id: 'canopy-accent',
        d: 'M60 88 Q75 62 100 65 Q125 62 140 90 Q115 78 100 80 Q85 82 60 88 Z',
        fill: 'accent',
      },
      {
        id: 'shaft',
        d: 'M97 100 L97 185 Q97 195 100 198 Q103 195 103 185 L103 100 Z',
        fill: 'dark',
      },
      {
        id: 'handle',
        d: 'M103 185 Q103 195 100 198 Q97 195 97 185 Q97 192 90 198 Q82 202 78 195 Q74 188 80 184 Q88 182 97 185 Z',
        fill: 'dark',
      },
      {
        id: 'tip',
        d: 'M100 38 L100 32 Q100 28 100 32 Z',
        fill: 'accent',
      },
    ],
  },

  'balloon': {
    name: 'Balloon',
    category: 'accessories',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'balloon-body',
        d: 'M35 75 Q35 25 100 20 Q165 15 168 70 Q172 115 140 140 Q125 155 100 158 Q75 155 60 140 Q30 115 35 75 Z',
        fill: 'primary',
      },
      {
        id: 'balloon-shine',
        d: 'M55 45 Q62 30 80 22 Q65 30 58 50 Z',
        fill: 'light',
      },
      {
        id: 'balloon-shading',
        d: 'M145 70 Q150 45 138 30 Q152 50 155 80 Q158 110 142 135 Q155 115 145 70 Z',
        fill: 'secondary',
      },
      {
        id: 'knot',
        d: 'M92 158 Q92 165 100 168 Q108 165 108 158 Q108 152 100 150 Q92 152 92 158 Z',
        fill: 'secondary',
      },
      {
        id: 'string',
        d: 'M100 168 Q96 175 102 185 Q98 195 100 200',
        fill: 'dark',
      },
    ],
  },

  'skateboard': {
    name: 'Skateboard',
    category: 'accessories',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'deck',
        d: 'M15 90 Q15 80 30 78 L170 78 Q185 80 185 90 L185 115 Q185 125 170 128 L30 128 Q15 125 15 115 Z',
        fill: 'primary',
      },
      {
        id: 'deck-graphic',
        d: 'M50 88 Q50 80 100 80 Q150 80 150 88 L150 118 Q150 126 100 126 Q50 126 50 118 Z',
        fill: 'accent',
      },
      {
        id: 'graphic-design',
        d: 'M75 100 L80 88 L85 100 L75 94 L85 94 Z M115 100 L120 88 L125 100 L115 94 L125 94 Z M97 105 L100 96 L103 105 L96 100 L104 100 Z',
        fill: 'secondary',
      },
      {
        id: 'trucks',
        d: 'M25 128 L55 128 L55 138 Q55 142 40 142 Q25 142 25 138 Z M145 128 L175 128 L175 138 Q175 142 160 142 Q145 142 145 138 Z',
        fill: 'dark',
      },
      {
        id: 'wheels',
        d: 'M22 138 Q22 128 32 128 Q42 128 42 138 Q42 148 32 148 Q22 148 22 138 Z M48 138 Q48 128 58 128 Q68 128 68 138 Q68 148 58 148 Q48 148 48 138 Z M132 138 Q132 128 142 128 Q152 128 152 138 Q152 148 142 148 Q132 148 132 138 Z M158 138 Q158 128 168 128 Q178 128 178 138 Q178 148 168 148 Q158 148 158 138 Z',
        fill: 'secondary',
      },
      {
        id: 'wheel-hubs',
        d: 'M29 138 Q32 135 35 138 Q32 141 29 138 Z M55 138 Q58 135 61 138 Q58 141 55 138 Z M139 138 Q142 135 145 138 Q142 141 139 138 Z M165 138 Q168 135 171 138 Q168 141 165 138 Z',
        fill: 'light',
      },
    ],
  },

  // ─── TAIL FLAIR ───────────────────────────────────────────────────────────

  'tail-ribbon': {
    name: 'Tail Ribbon',
    category: 'tailFlair',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'ribbon-left',
        d: 'M60 95 Q40 75 22 90 Q15 100 22 115 Q40 130 65 115 Q80 105 80 95 Z',
        fill: 'primary',
      },
      {
        id: 'ribbon-right',
        d: 'M140 95 Q160 75 178 90 Q185 100 178 115 Q160 130 135 115 Q120 105 120 95 Z',
        fill: 'primary',
      },
      {
        id: 'ribbon-tails',
        d: 'M80 100 Q90 108 85 125 Q78 145 72 165 Q68 180 75 190 Q65 182 62 165 Q58 145 65 122 Q70 108 80 100 Z M120 100 Q110 108 115 125 Q122 145 128 165 Q132 180 125 190 Q135 182 138 165 Q142 145 135 122 Q130 108 120 100 Z',
        fill: 'secondary',
      },
      {
        id: 'knot',
        d: 'M80 90 Q80 80 100 78 Q120 76 120 86 L120 110 Q120 120 100 122 Q80 124 80 114 Z',
        fill: 'accent',
      },
      {
        id: 'knot-detail',
        d: 'M82 100 Q100 96 118 100 Q100 104 82 100 Z',
        fill: 'primary',
      },
    ],
  },

  'jingle-bells': {
    name: 'Jingle Bells',
    category: 'tailFlair',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'ribbon',
        d: 'M70 45 Q70 35 100 32 Q130 29 130 40 L130 60 Q130 70 100 72 Q70 74 70 62 Z',
        fill: 'primary',
      },
      {
        id: 'bell-left',
        d: 'M30 65 Q28 50 42 45 Q56 40 62 55 Q68 68 58 82 Q48 95 35 90 Q25 82 30 65 Z',
        fill: 'accent',
      },
      {
        id: 'bell-center',
        d: 'M80 75 Q78 58 100 52 Q122 46 125 62 Q128 78 115 90 Q100 102 85 95 Q75 88 80 75 Z',
        fill: 'accent',
      },
      {
        id: 'bell-right',
        d: 'M140 65 Q138 50 152 45 Q166 40 172 55 Q178 68 168 82 Q158 95 145 90 Q135 82 140 65 Z',
        fill: 'accent',
      },
      {
        id: 'bell-slits',
        d: 'M38 80 Q42 84 46 80 M95 88 Q100 92 105 88 M148 80 Q152 84 156 80',
        fill: 'dark',
      },
      {
        id: 'bell-shine',
        d: 'M34 62 Q38 55 44 55 Q38 58 35 65 Z M89 65 Q93 58 100 56 Q94 60 91 68 Z M144 62 Q148 55 154 55 Q148 58 145 65 Z',
        fill: 'light',
      },
    ],
  },

  'tail-bow': {
    name: 'Tail Bow',
    category: 'tailFlair',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'left-loop',
        d: 'M10 80 Q10 50 38 45 Q62 40 78 65 Q88 82 80 100 Q72 115 50 118 Q20 118 10 98 Q5 90 10 80 Z',
        fill: 'primary',
      },
      {
        id: 'right-loop',
        d: 'M190 80 Q190 50 162 45 Q138 40 122 65 Q112 82 120 100 Q128 115 150 118 Q180 118 190 98 Q195 90 190 80 Z',
        fill: 'primary',
      },
      {
        id: 'left-loop-shading',
        d: 'M15 85 Q18 60 40 52 Q25 60 20 80 Q15 95 22 110 Q14 100 15 85 Z',
        fill: 'secondary',
      },
      {
        id: 'right-loop-shading',
        d: 'M185 85 Q182 60 160 52 Q175 60 180 80 Q185 95 178 110 Q186 100 185 85 Z',
        fill: 'secondary',
      },
      {
        id: 'tails',
        d: 'M80 105 Q85 115 75 135 Q65 155 68 175 Q60 158 60 138 Q60 118 75 108 Z M120 105 Q115 115 125 135 Q135 155 132 175 Q140 158 140 138 Q140 118 125 108 Z',
        fill: 'secondary',
      },
      {
        id: 'center-knot',
        d: 'M78 80 Q78 68 100 65 Q122 62 122 74 L122 115 Q122 127 100 130 Q78 133 78 121 Z',
        fill: 'accent',
      },
    ],
  },

  'pennant-flag': {
    name: 'Pennant Flag',
    category: 'tailFlair',
    viewBox: '0 0 200 200',
    layers: [
      {
        id: 'pole',
        d: 'M38 20 Q40 18 44 18 L44 185 Q44 188 41 188 Q38 188 38 185 Z',
        fill: 'dark',
      },
      {
        id: 'flag',
        d: 'M44 22 L178 75 L44 128 Z',
        fill: 'primary',
      },
      {
        id: 'flag-stripe',
        d: 'M44 45 L155 75 L44 105 Z',
        fill: 'secondary',
      },
      {
        id: 'flag-stripe-2',
        d: 'M44 60 L130 75 L44 90 Z',
        fill: 'accent',
      },
      {
        id: 'flag-star',
        d: 'M80 75 L83 65 L86 75 L76 69 L90 69 Z',
        fill: 'light',
      },
      {
        id: 'pole-tip',
        d: 'M38 18 Q41 10 44 18 Q41 22 38 18 Z',
        fill: 'accent',
      },
    ],
  },

};