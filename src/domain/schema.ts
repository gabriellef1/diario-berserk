import { z } from 'zod'
import { editions } from '@/config'

export const SCHEMA_VERSION = 3

const isoDate = z.iso.datetime({ offset: true })
/** Dia local, YYYY-MM-DD. */
const day = z.iso.date()
const volumeKey = z.string().regex(/^[1-9]\d{0,2}$/)

export const positionSchema = z.object({
  kind: z.enum(['page', 'chapter']),
  value: z.number().int().min(0).max(5000),
})

/** Onde ele estava quando escreveu algo. Base de todo gate antispoiler. */
export const markSchema = z.object({
  volume: z.number().int().min(1).max(999),
  position: positionSchema.nullable(),
  /** Já tinha terminado o volume quando escreveu. */
  caughtUp: z.boolean().optional(),
})

export const volumeLogSchema = z.object({
  startedAt: isoDate.optional(),
  finishedAt: isoDate.optional(),
  /** Total de páginas do volume, se ele informar. */
  pagesTotal: z.number().int().min(1).max(2000).optional(),
})

export const collectionItemSchema = z.object({
  status: z.enum(['have', 'want', 'no']),
  price: z.number().min(0).max(100000).optional(),
  boughtAt: day.optional(),
})

const readerSchema = z.object({
  currentVolume: z.number().int().min(1).max(999),
  /** Última página/capítulo lido no volume atual. */
  position: positionSchema.nullable(),
  trackBy: z.enum(['page', 'chapter']),
  /** Terminou o último volume lançado. */
  caughtUp: z.boolean(),
})

export const stateV1Schema = z.object({
  schemaVersion: z.literal(1),
  editionId: z.string().min(1),
  createdAt: isoDate,
  reader: readerSchema,
  volumes: z.record(volumeKey, volumeLogSchema),
  collection: z.record(volumeKey, collectionItemSchema),
  /** Páginas lidas por dia local. Base de ritmo e constância. */
  readingLog: z.record(day, z.number().int().min(0).max(5000)),
})

/** Texto dele, sempre preso ao ponto da leitura em que foi escrito. */
export const writtenSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  at: isoDate,
  mark: markSchema,
})

export const doubtSchema = z.object({
  id: z.string().min(1).max(64),
  text: z.string().trim().min(1).max(1000),
  askedAt: isoDate,
  /** Onde ele estava quando perguntou. */
  mark: markSchema,
  /** "Lembrar quando eu chegar no volume X". */
  remindAt: z.number().int().min(1).max(999).optional(),
  status: z.enum(['open', 'answered']),
  /** Volume em que ele já viu o lembrete e respondeu "ainda não". */
  promptedAtVolume: z.number().int().min(1).max(999).optional(),
  answer: writtenSchema.optional(),
  /** Resposta que ele colou do ChatGPT. */
  gptAnswer: writtenSchema.optional(),
})

export const reactions = ['impacto', 'arrepio', 'risada', 'tensao', 'tristeza', 'brasa'] as const

export const noteSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  reaction: z.enum(reactions).optional(),
  text: z.string().max(4000).optional(),
  updatedAt: isoDate,
  /** Ponto mais avançado da leitura em que a nota foi editada. */
  mark: markSchema,
})

const stateV2Base = stateV1Schema.extend({
  schemaVersion: z.literal(2),
  doubts: z.array(doubtSchema),
  notes: z.record(volumeKey, noteSchema),
  /** Conquistas que ele já viu desbloquear (pra animar só uma vez). */
  achievementsSeen: z.array(z.string().max(64)),
})

/** Coerência que o formato sozinho não garante (backup editado à mão, por exemplo). */
function checkCoherence(
  s: { editionId: string; reader: { currentVolume: number }; doubts: { id: string }[] },
  ctx: z.RefinementCtx,
) {
  const edition = editions[s.editionId]
  if (!edition) {
    ctx.addIssue({ code: 'custom', path: ['editionId'], message: 'edição desconhecida' })
    return
  }
  if (s.reader.currentVolume > edition.releasedUpTo) {
    ctx.addIssue({ code: 'custom', path: ['reader', 'currentVolume'], message: 'fora da edição' })
  }
  const ids = new Set<string>()
  for (const d of s.doubts) {
    if (ids.has(d.id)) {
      ctx.addIssue({ code: 'custom', path: ['doubts'], message: `id repetido: ${d.id}` })
    }
    ids.add(d.id)
  }
}

export const stateV2Schema = stateV2Base.superRefine(checkCoherence)

/** Versão dele de um resumo: tem prioridade sobre o padrão enquanto existir. */
export const chapterEditSchema = z.object({
  volume: z.number().int().min(1).max(999),
  /** Posição do capítulo dentro do volume (0 = primeiro). */
  index: z.number().int().min(0).max(99),
  text: z.string().trim().min(1).max(2000),
  at: isoDate,
})

export const settingsSchema = z.object({
  /** Desliga os resumos de capítulo em todo lugar. */
  hideSummaries: z.boolean(),
  /** Entrada: automática (completa 1x por dia, curta depois), sempre curta, desligada. */
  intro: z.enum(['auto', 'short', 'off']),
  /** Fundo animado. */
  atmosphere: z.boolean(),
})

export const introStateSchema = z.object({
  /** Último dia local em que a entrada completa rodou. */
  lastFullDay: day.optional(),
  /** Volume recém-concluído, pra próxima entrada comemorar. Consumido uma vez. */
  celebrateVolume: z.number().int().min(1).max(999).optional(),
})

export const stateV3Schema = stateV2Base
  .extend({
    schemaVersion: z.literal(3),
    /** Quantos capítulos ele marcou como lidos em cada volume (só o atual importa). */
    chaptersRead: z.record(volumeKey, z.number().int().min(0).max(99)),
    /** Resumos reescritos por ele, por id de capítulo. Ficam guardados mesmo se ele voltar o progresso. */
    chapterEdits: z.record(z.string().regex(/^c(0-\d{2}|\d{1,3})$/), chapterEditSchema),
    settings: settingsSchema,
    intro: introStateSchema,
  })
  .superRefine(checkCoherence)

export const defaultSettings: z.infer<typeof settingsSchema> = {
  hideSummaries: false,
  intro: 'auto',
  atmosphere: true,
}

export type Position = z.infer<typeof positionSchema>
export type Mark = z.infer<typeof markSchema>
export type VolumeLog = z.infer<typeof volumeLogSchema>
export type CollectionItem = z.infer<typeof collectionItemSchema>
export type CollectionStatus = CollectionItem['status']
export type Written = z.infer<typeof writtenSchema>
export type Doubt = z.infer<typeof doubtSchema>
export type Reaction = (typeof reactions)[number]
export type Note = z.infer<typeof noteSchema>
export type ChapterEdit = z.infer<typeof chapterEditSchema>
export type Settings = z.infer<typeof settingsSchema>
export type IntroState = z.infer<typeof introStateSchema>
export type DiaryStateV1 = z.infer<typeof stateV1Schema>
export type DiaryStateV2 = z.infer<typeof stateV2Schema>
export type DiaryState = z.infer<typeof stateV3Schema>

export const currentSchema = stateV3Schema
