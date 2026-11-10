import { chapterNumber, type Chapter, type VolumeChapters } from '@/data/chapters/types'
import { importVolumeChapters } from '@/data/chapters'
import { isVolumeUnlocked } from './gates'
import type { DiaryState } from './schema'

/**
 * Gate dos resumos. A regra: o resumo de um capítulo só existe pra ele depois
 * que ele passou daquele capítulo. Tudo que a interface mostra sobre capítulos
 * sai de `chapterViews`, que já vem sem o texto dos não lidos.
 */

/** Capítulos lidos derivados da posição "por capítulo" (número impresso). */
function readFromPosition(state: DiaryState, chapters: readonly Chapter[]): number {
  const pos = state.reader.position
  if (pos?.kind !== 'chapter') return 0
  // Corrida inicial de números crescentes até o valor marcado. Para no primeiro
  // número maior ou quando a numeração reinicia ("0-16" → "1"): na dúvida, menos.
  let count = 0
  let prev = -1
  for (const c of chapters) {
    const { n } = chapterNumber(c.number)
    if (n > pos.value || n < prev) break
    prev = n
    count++
  }
  return count
}

/** Quantos capítulos de `volume` estão liberados. Volume à frente: zero, sempre. */
export function readChapterCount(
  state: DiaryState,
  volume: number,
  chapters: readonly Chapter[],
): number {
  const cur = state.reader.currentVolume
  if (volume > cur) return 0
  if (volume < cur || state.reader.caughtUp) return chapters.length
  const explicit = state.chaptersRead[String(volume)] ?? 0
  return Math.min(chapters.length, Math.max(explicit, readFromPosition(state, chapters)))
}

/**
 * Versão do reducer, sem a lista de capítulos: usa o número impresso do
 * capítulo. Serve pra recusar edição de resumo não lido.
 */
export function chapterIsRead(
  state: DiaryState,
  volume: number,
  index: number,
  n: number,
): boolean {
  const cur = state.reader.currentVolume
  if (volume > cur) return false
  if (volume < cur || state.reader.caughtUp) return true
  if (index < (state.chaptersRead[String(volume)] ?? 0)) return true
  const pos = state.reader.position
  return pos?.kind === 'chapter' && n <= pos.value
}

export interface ChapterView {
  id: string
  number: string
  /** null quando o título entrega algo e ele ainda não leu. */
  title: string | null
  read: boolean
  /** Só existe em capítulo lido e com resumos ligados. */
  summary?: string
  /** O resumo mostrado é a versão dele. */
  edited?: boolean
  needsReview?: boolean
}

/** A única porta de saída dos dados de capítulo pra interface. */
export function chapterViews(state: DiaryState, data: VolumeChapters): ChapterView[] {
  const count = readChapterCount(state, data.volume, data.chapters)
  const hide = state.settings.hideSummaries
  return data.chapters.map((c, i) => {
    const read = i < count
    const view: ChapterView = {
      id: c.id,
      number: c.number,
      title: read || !c.hideTitleUntilRead ? c.title : null,
      read,
    }
    if (read && !hide) {
      const edit = state.chapterEdits[c.id]
      view.summary = edit ? edit.text : c.summary
      if (edit) view.edited = true
      if (c.needsReview && !edit) view.needsReview = true
    }
    return view
  })
}

/** Carrega o volume só se ele já chegou lá. Volume à frente nunca é importado. */
export function loadReadableVolume(
  state: DiaryState,
  volume: number,
): Promise<VolumeChapters | null> {
  if (!isVolumeUnlocked(volume, state)) return Promise.resolve(null)
  return importVolumeChapters(volume)
}

export interface LastRead {
  volume: number
  view: ChapterView
}

/**
 * Último capítulo lido, pro card "da última vez": o último liberado do volume
 * atual ou, se ele ainda não marcou nada nele, o último do volume anterior.
 */
export async function lastReadChapter(state: DiaryState): Promise<LastRead | null> {
  if (state.settings.hideSummaries) return null
  const cur = state.reader.currentVolume
  for (const volume of [cur, cur - 1]) {
    if (volume < 1) break
    const data = await loadReadableVolume(state, volume)
    if (!data) continue
    const views = chapterViews(state, data)
    const last = [...views].reverse().find((v) => v.read && v.summary !== undefined)
    if (last) return { volume, view: last }
  }
  return null
}
