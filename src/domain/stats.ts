import { daysBetween, localDay } from './dates'
import type { DiaryState } from './schema'

export interface VolumeHistory {
  volume: number
  startedAt?: string
  finishedAt?: string
  days?: number
}

/** Histórico só dos volumes já alcançados (gate por construção). */
export function history(state: DiaryState): VolumeHistory[] {
  const out: VolumeHistory[] = []
  for (let v = 1; v <= state.reader.currentVolume; v++) {
    const log = state.volumes[String(v)]
    const h: VolumeHistory = { volume: v, startedAt: log?.startedAt, finishedAt: log?.finishedAt }
    if (log?.startedAt && log.finishedAt) {
      h.days = Math.max(1, daysBetween(log.startedAt, log.finishedAt))
    }
    out.push(h)
  }
  return out
}

export function finishedCount(state: DiaryState): number {
  return state.reader.currentVolume - 1 + (state.reader.caughtUp ? 1 : 0)
}

/** Média de dias por volume, só com volumes que têm início e fim no diário. */
export function avgDaysPerVolume(state: DiaryState): number | null {
  const timed = history(state).filter((h) => h.days !== undefined)
  if (timed.length === 0) return null
  return timed.reduce((s, h) => s + (h.days ?? 0), 0) / timed.length
}

/** Páginas por dia desde o primeiro dia registrado. */
export function pagesPerDay(state: DiaryState, nowIso: string): number | null {
  const days = Object.keys(state.readingLog).sort()
  const first = days[0]
  if (!first) return null
  const total = Object.values(state.readingLog).reduce((s, n) => s + n, 0)
  const span = daysBetween(first + 'T12:00:00', nowIso) + 1
  return total / Math.max(1, span)
}

function shift(day: string, delta: number): string {
  const d = new Date(day + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return localDay(d.toISOString())
}

/** Dias seguidos com leitura até hoje (ou até ontem, se hoje ainda não leu). */
export function streak(state: DiaryState, nowIso: string): number {
  const read = new Set(
    Object.entries(state.readingLog)
      .filter(([, n]) => n > 0)
      .map(([d]) => d),
  )
  let cursor = localDay(nowIso)
  if (!read.has(cursor)) cursor = shift(cursor, -1)
  let count = 0
  while (read.has(cursor)) {
    count++
    cursor = shift(cursor, -1)
  }
  return count
}

/** Maior sequência de dias seguidos com leitura. */
export function bestStreak(state: DiaryState): number {
  const days = Object.entries(state.readingLog)
    .filter(([, n]) => n > 0)
    .map(([d]) => d)
    .sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of days) {
    run = prev !== null && shift(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}
