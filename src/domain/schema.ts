import { z } from 'zod'

export const SCHEMA_VERSION = 2

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

export const stateV2Schema = stateV1Schema.extend({
  schemaVersion: z.literal(2),
  doubts: z.array(doubtSchema),
  notes: z.record(volumeKey, noteSchema),
  /** Conquistas que ele já viu desbloquear (pra animar só uma vez). */
  achievementsSeen: z.array(z.string().max(64)),
})

export type Position = z.infer<typeof positionSchema>
export type Mark = z.infer<typeof markSchema>
export type VolumeLog = z.infer<typeof volumeLogSchema>
export type CollectionItem = z.infer<typeof collectionItemSchema>
export type CollectionStatus = CollectionItem['status']
export type Written = z.infer<typeof writtenSchema>
export type Doubt = z.infer<typeof doubtSchema>
export type Reaction = (typeof reactions)[number]
export type Note = z.infer<typeof noteSchema>
export type DiaryStateV1 = z.infer<typeof stateV1Schema>
export type DiaryState = z.infer<typeof stateV2Schema>

export const currentSchema = stateV2Schema
