function channel(c: number) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  )
}

/** Razão de contraste WCAG entre duas cores sólidas. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Tokens de cor (espelho do @theme em globals.css). */
export const tokens = {
  bg: '#141210',
  surface: '#1e1a16',
  raised: '#29231d',
  line: '#3a322a',
  'line-strong': '#897965',
  ink: '#f2e8d5',
  'ink-2': '#c0b39e',
  blood: '#862e32',
  'blood-hover': '#9a3439',
  'blood-text': '#ed8580',
  ember: '#dca45c',
  gold: '#bfa269',
} as const
