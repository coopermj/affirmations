// Per-page text legibility treatments. Stored on Page.textEffect as a string
// key (same approach as background gradient presets). Each key maps to a
// `.text-effect-<key>` class defined in globals.css.

export const TEXT_EFFECTS = [
  { key: 'shadow', label: 'Soft shadow', hint: 'Gentle drop shadow (default)' },
  { key: 'strong-shadow', label: 'Strong shadow', hint: 'Heavier glow for busy photos' },
  { key: 'outline', label: 'Black outline', hint: 'Crisp stroke for light/mixed backgrounds' },
  { key: 'outline-shadow', label: 'Outline + shadow', hint: 'Maximum contrast' },
  { key: 'none', label: 'None', hint: 'No effect' },
] as const

export type TextEffectKey = (typeof TEXT_EFFECTS)[number]['key']

export const DEFAULT_TEXT_EFFECT: TextEffectKey = 'shadow'

export function isTextEffect(value: string | null | undefined): value is TextEffectKey {
  return TEXT_EFFECTS.some(e => e.key === value)
}

/** CSS class for a (possibly invalid/missing) text-effect key. */
export function textEffectClass(value: string | null | undefined): string {
  return `text-effect-${isTextEffect(value) ? value : DEFAULT_TEXT_EFFECT}`
}
