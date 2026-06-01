/**
 * Curated gradient backgrounds. Each is deep enough that the light affirmation
 * text stays legible. `css` is a ready-to-use CSS `background` value.
 */
export interface GradientPreset {
  key: string
  label: string
  css: string
}

export const GRADIENTS: GradientPreset[] = [
  {
    key: 'last-light',
    label: 'Last Light',
    css: 'radial-gradient(120% 120% at 50% 0%, #8a4b38 0%, #5e3550 45%, #2c2236 100%)',
  },
  {
    key: 'sunrise',
    label: 'Sunrise',
    css: 'linear-gradient(160deg, #c2603f 0%, #a23f55 50%, #4a2742 100%)',
  },
  {
    key: 'dusk',
    label: 'Dusk',
    css: 'linear-gradient(160deg, #2b3a67 0%, #3f2d63 55%, #1c1a2e 100%)',
  },
  {
    key: 'meadow',
    label: 'Meadow',
    css: 'linear-gradient(160deg, #3c5a4a 0%, #2f4858 55%, #1f2a33 100%)',
  },
  {
    key: 'ember',
    label: 'Ember',
    css: 'linear-gradient(160deg, #7a1f2b 0%, #a8431f 55%, #3a1414 100%)',
  },
  {
    key: 'blossom',
    label: 'Blossom',
    css: 'linear-gradient(160deg, #8a4a6d 0%, #6d4a8a 55%, #2e2440 100%)',
  },
  {
    key: 'gold-hour',
    label: 'Gold Hour',
    css: 'linear-gradient(160deg, #9c6a2f 0%, #7a4a2a 55%, #3a2a1c 100%)',
  },
  {
    key: 'ink',
    label: 'Ink',
    css: 'linear-gradient(160deg, #2b2b33 0%, #1c1c22 60%, #111114 100%)',
  },
]

const DEFAULT_GRADIENT = GRADIENTS[0]

/** Resolve a gradient preset key to its CSS, falling back to the first preset. */
export function gradientCss(key: string | null | undefined): string {
  return GRADIENTS.find(g => g.key === key)?.css ?? DEFAULT_GRADIENT.css
}
