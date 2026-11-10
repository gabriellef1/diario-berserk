import { getEdition } from '@/config'
import { localDay } from './dates'
import { chapterIsRead } from './chapters'
import { hasHiddenParts, isVisible, laterMark, progressMark } from './gates'
import {
  SCHEMA_VERSION,
  defaultSettings,
  type CollectionItem,
  type DiaryState,
  type Doubt,
  type Position,
  type Reaction,
  type Settings,
} from './schema'

export interface OnboardingInput {
  editionId: string
  currentVolume: number
  position: Position | null
  owned: number[]
  at: string
}

export function createState(input: OnboardingInput): DiaryState {
  const edition = getEdition(input.editionId)
  const current = clamp(input.currentVolume, 1, edition.releasedUpTo)
  const collection: DiaryState['collection'] = {}
  for (const v of input.owned) {
    if (v >= 1 && v <= edition.releasedUpTo) collection[String(v)] = { status: 'have' }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    editionId: edition.id,
    createdAt: input.at,
    reader: {
      currentVolume: current,
      position: input.position,
      trackBy: input.position?.kind ?? 'page',
      caughtUp: false,
    },
    volumes: { [String(current)]: { startedAt: input.at } },
    collection,
    readingLog: {},
    doubts: [],
    notes: {},
    achievementsSeen: [],
    chaptersRead: {},
    chapterEdits: {},
    settings: { ...defaultSettings },
    intro: {},
  }
}

export type Action =
  | { type: 'addProgress'; amount: number; at: string }
  | { type: 'setPosition'; position: Position | null; at: string }
  | { type: 'setTrackBy'; trackBy: Position['kind'] }
  | { type: 'finishVolume'; at: string }
  | { type: 'jumpTo'; volume: number; position: Position | null; at: string }
  | { type: 'setPagesTotal'; volume: number; pagesTotal: number | undefined }
  | { type: 'setCollection'; volume: number; item: CollectionItem }
  | { type: 'addDoubt'; id: string; text: string; remindAt?: number; at: string }
  | { type: 'editDoubt'; id: string; text: string; remindAt?: number }
  | { type: 'answerDoubt'; id: string; text: string; at: string }
  | { type: 'doubtNotYet'; id: string }
  | { type: 'postponeDoubt'; id: string; remindAt: number }
  | { type: 'reopenDoubt'; id: string }
  | {
      type: 'saveGptAnswer'
      id: string
      text: string
      at: string
      source?: 'chatgpt' | 'claude'
    }
  | { type: 'deleteDoubt'; id: string }
  | {
      type: 'saveNote'
      volume: number
      rating?: number
      reaction?: Reaction
      text?: string
      at: string
    }
  | { type: 'markAchievementsSeen'; ids: string[] }
  /** "Li esse capítulo": libera ele e os anteriores do volume atual. `n` = número impresso. */
  | { type: 'markChapter'; volume: number; index: number; n: number }
  /** Desmarca: esconde ele e os seguintes. `prevN` = número impresso do anterior (null se é o primeiro). */
  | { type: 'unmarkChapter'; volume: number; index: number; prevN: number | null }
  | {
      type: 'editChapterSummary'
      id: string
      volume: number
      index: number
      n: number
      text: string
      at: string
    }
  | { type: 'resetChapterSummary'; id: string }
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'introShown'; day: string; kind: 'full' | 'short' }

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/**
 * Só mexe em dúvidas que ele consegue ver agora e que não guardam nada escrito
 * mais à frente (senão a ação apagaria ou trocaria um texto que ele nem vê).
 */
function updateDoubt(state: DiaryState, id: string, fn: (d: Doubt) => Doubt): DiaryState {
  const p = progressMark(state)
  let changed = false
  const doubts = state.doubts.map((d) => {
    if (d.id !== id || !isVisible(d.mark, p) || hasHiddenParts(d, p)) return d
    changed = true
    return fn(d)
  })
  return changed ? { ...state, doubts } : state
}

function cleanText(t: string) {
  return t.trim().slice(0, 4000)
}

function logPages(log: DiaryState['readingLog'], at: string, pages: number) {
  if (pages <= 0) return log
  const d = localDay(at)
  return { ...log, [d]: (log[d] ?? 0) + pages }
}

export function reduce(state: DiaryState, action: Action): DiaryState {
  const edition = getEdition(state.editionId)
  const cur = state.reader.currentVolume
  switch (action.type) {
    case 'addProgress': {
      if (state.reader.caughtUp || action.amount <= 0) return state
      const kind = state.reader.trackBy
      const prev = state.reader.position?.kind === kind ? state.reader.position.value : 0
      let value = prev + action.amount
      const total = state.volumes[String(cur)]?.pagesTotal
      if (kind === 'page' && total) value = Math.min(value, total)
      const read = value - prev
      // Página entra no ritmo; capítulo só marca o dia como lido.
      const logged = kind === 'page' ? read : read > 0 ? 1 : 0
      return {
        ...state,
        reader: { ...state.reader, position: { kind, value } },
        readingLog: logPages(state.readingLog, action.at, logged),
      }
    }
    case 'setPosition': {
      if (state.reader.caughtUp) return state
      const prev = state.reader.position
      const next = action.position
      const delta = next?.kind === 'page' && prev?.kind === 'page' ? next.value - prev.value : 0
      return {
        ...state,
        reader: { ...state.reader, position: next, trackBy: next?.kind ?? state.reader.trackBy },
        readingLog: logPages(state.readingLog, action.at, delta),
      }
    }
    case 'setTrackBy':
      return { ...state, reader: { ...state.reader, trackBy: action.trackBy } }
    case 'finishVolume': {
      if (state.reader.caughtUp) return state
      const key = String(cur)
      const log = state.volumes[key] ?? {}
      const pos = state.reader.position
      const remaining =
        log.pagesTotal && pos?.kind === 'page' ? Math.max(0, log.pagesTotal - pos.value) : 0
      const volumes = { ...state.volumes, [key]: { ...log, finishedAt: action.at } }
      const readingLog = logPages(state.readingLog, action.at, Math.max(remaining, 1))
      const intro = { ...state.intro, celebrateVolume: cur }
      if (cur >= edition.releasedUpTo) {
        return { ...state, volumes, readingLog, intro, reader: { ...state.reader, caughtUp: true } }
      }
      const next = String(cur + 1)
      return {
        ...state,
        volumes: { ...volumes, [next]: { ...volumes[next], startedAt: action.at } },
        readingLog,
        intro,
        reader: { ...state.reader, currentVolume: cur + 1, position: null, caughtUp: false },
      }
    }
    case 'jumpTo': {
      // Correção manual. Ao voltar, os volumes à frente perdem início e fim.
      const volume = clamp(action.volume, 1, edition.releasedUpTo)
      const volumes: DiaryState['volumes'] = {}
      for (const [k, v] of Object.entries(state.volumes)) {
        const n = Number(k)
        if (n < volume) volumes[k] = v
        else if (n === volume) volumes[k] = { pagesTotal: v.pagesTotal, startedAt: v.startedAt }
        else if (v.pagesTotal) volumes[k] = { pagesTotal: v.pagesTotal }
      }
      const key = String(volume)
      volumes[key] = { ...volumes[key], startedAt: volumes[key]?.startedAt ?? action.at }
      if (volumes[key].pagesTotal === undefined) delete volumes[key].pagesTotal
      const chaptersRead: DiaryState['chaptersRead'] = {}
      for (const [k, v] of Object.entries(state.chaptersRead))
        if (Number(k) < volume) chaptersRead[k] = v
      return {
        ...state,
        volumes,
        chaptersRead,
        reader: {
          ...state.reader,
          currentVolume: volume,
          position: action.position,
          trackBy: action.position?.kind ?? state.reader.trackBy,
          caughtUp: false,
        },
      }
    }
    case 'setPagesTotal': {
      const key = String(action.volume)
      const { pagesTotal: _drop, ...rest } = state.volumes[key] ?? {}
      return {
        ...state,
        volumes: {
          ...state.volumes,
          [key]: action.pagesTotal ? { ...rest, pagesTotal: action.pagesTotal } : rest,
        },
      }
    }
    case 'setCollection': {
      if (action.volume > edition.releasedUpTo) return state
      return { ...state, collection: { ...state.collection, [String(action.volume)]: action.item } }
    }
    case 'addDoubt': {
      const text = action.text.trim().slice(0, 1000)
      if (!text) return state
      const doubt: Doubt = {
        id: action.id,
        text,
        askedAt: action.at,
        mark: progressMark(state),
        status: 'open',
      }
      if (action.remindAt !== undefined)
        doubt.remindAt = clamp(action.remindAt, 1, edition.totalVolumes)
      return { ...state, doubts: [doubt, ...state.doubts] }
    }
    case 'editDoubt': {
      const text = action.text.trim().slice(0, 1000)
      if (!text) return state
      return updateDoubt(state, action.id, (d) => {
        const { remindAt: _r, promptedAtVolume, ...rest } = d
        // Texto editado agora pode conter o que ele sabe agora: a marca avança.
        const base = { ...rest, text, mark: laterMark(d.mark, progressMark(state)) }
        if (action.remindAt === undefined) return base
        const remindAt = clamp(action.remindAt, 1, edition.totalVolumes)
        // Mesmo lembrete: mantém o "ainda não" pra não voltar de novo no mesmo volume.
        return remindAt === d.remindAt && promptedAtVolume !== undefined
          ? { ...base, remindAt, promptedAtVolume }
          : { ...base, remindAt }
      })
    }
    case 'answerDoubt': {
      const text = cleanText(action.text)
      if (!text) return state
      return updateDoubt(state, action.id, (d) => ({
        ...d,
        status: 'answered',
        answer: { text, at: action.at, mark: progressMark(state) },
      }))
    }
    case 'doubtNotYet':
      return updateDoubt(state, action.id, (d) => ({ ...d, promptedAtVolume: cur }))
    case 'postponeDoubt':
      return updateDoubt(state, action.id, (d) => {
        if (d.status !== 'open') return d
        const { promptedAtVolume: _p, ...rest } = d
        return {
          ...rest,
          status: 'open',
          remindAt: clamp(action.remindAt, 1, edition.totalVolumes),
        }
      })
    case 'reopenDoubt':
      return updateDoubt(state, action.id, (d) => {
        const { answer: _a, ...rest } = d
        return { ...rest, status: 'open' }
      })
    case 'saveGptAnswer': {
      const text = cleanText(action.text)
      if (!text) return state
      return updateDoubt(state, action.id, (d) => ({
        ...d,
        gptAnswer: {
          text,
          at: action.at,
          mark: progressMark(state),
          ...(action.source ? { source: action.source } : {}),
        },
      }))
    }
    case 'deleteDoubt': {
      const p = progressMark(state)
      const doubts = state.doubts.filter(
        (d) => d.id !== action.id || !isVisible(d.mark, p) || hasHiddenParts(d, p),
      )
      return doubts.length === state.doubts.length ? state : { ...state, doubts }
    }
    case 'saveNote': {
      // Nota só pra volume já alcançado.
      if (action.volume < 1 || action.volume > cur) return state
      const key = String(action.volume)
      const p = progressMark(state)
      const prev = state.notes[key]
      // Nota escrita mais à frente: não deixa sobrescrever o que ele nem vê.
      if (prev && !isVisible(prev.mark, p)) return state
      const base = prev
      const text = action.text?.trim().slice(0, 4000)
      const note = {
        ...(action.rating !== undefined ? { rating: clamp(action.rating, 1, 5) } : {}),
        ...(action.reaction !== undefined ? { reaction: action.reaction } : {}),
        ...(text ? { text } : {}),
        updatedAt: action.at,
        mark: base ? laterMark(base.mark, p) : p,
      }
      if (note.rating === undefined && note.reaction === undefined && !note.text) {
        const { [key]: _gone, ...notes } = state.notes
        return { ...state, notes }
      }
      return { ...state, notes: { ...state.notes, [key]: note } }
    }
    case 'markAchievementsSeen': {
      const fresh = action.ids.filter((id) => !state.achievementsSeen.includes(id))
      if (fresh.length === 0) return state
      return { ...state, achievementsSeen: [...state.achievementsSeen, ...fresh] }
    }
    case 'markChapter': {
      // Só no volume em andamento: os anteriores já estão todos liberados, os futuros nunca.
      if (action.volume !== cur || state.reader.caughtUp || action.index < 0) return state
      const key = String(cur)
      const count = Math.max(state.chaptersRead[key] ?? 0, action.index + 1)
      const pos = state.reader.position
      // Marcar por aqui também adianta a posição, se ele acompanha por capítulo.
      const reader =
        state.reader.trackBy === 'chapter' && (pos?.kind !== 'chapter' || pos.value < action.n)
          ? { ...state.reader, position: { kind: 'chapter' as const, value: action.n } }
          : state.reader
      if (count === (state.chaptersRead[key] ?? 0) && reader === state.reader) return state
      return { ...state, reader, chaptersRead: { ...state.chaptersRead, [key]: count } }
    }
    case 'unmarkChapter': {
      if (action.volume !== cur || state.reader.caughtUp || action.index < 0) return state
      const key = String(cur)
      const pos = state.reader.position
      // A posição por capítulo também recua, senão ela liberaria o resumo de novo.
      const reader =
        pos?.kind === 'chapter' && (action.prevN === null || pos.value > action.prevN)
          ? {
              ...state.reader,
              position:
                action.prevN === null ? null : { kind: 'chapter' as const, value: action.prevN },
            }
          : state.reader
      return { ...state, reader, chaptersRead: { ...state.chaptersRead, [key]: action.index } }
    }
    case 'editChapterSummary': {
      const text = action.text.trim().slice(0, 2000)
      if (!text || !chapterIsRead(state, action.volume, action.index, action.n)) return state
      return {
        ...state,
        chapterEdits: {
          ...state.chapterEdits,
          [action.id]: { volume: action.volume, index: action.index, text, at: action.at },
        },
      }
    }
    case 'resetChapterSummary': {
      if (!(action.id in state.chapterEdits)) return state
      const { [action.id]: _gone, ...chapterEdits } = state.chapterEdits
      return { ...state, chapterEdits }
    }
    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'introShown': {
      // Registra ao começar (pular também conta) e consome a comemoração.
      const { celebrateVolume: _c, ...rest } = state.intro
      const intro = action.kind === 'full' ? { ...rest, lastFullDay: action.day } : rest
      if (
        state.intro.celebrateVolume === undefined &&
        intro.lastFullDay === state.intro.lastFullDay
      ) {
        return state
      }
      return { ...state, intro }
    }
  }
}
