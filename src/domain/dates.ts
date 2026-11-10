/** Dia local YYYY-MM-DD (fuso do aparelho dele). */
export function localDay(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(localDay(fromIso) + 'T00:00:00')
  const b = new Date(localDay(toIso) + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

const fmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export function formatDate(iso: string): string {
  return fmt.format(new Date(iso)).replace(/\./g, '')
}

export function formatDay(day: string): string {
  return formatDate(day + 'T12:00:00')
}

export function nowIso() {
  return new Date().toISOString()
}
