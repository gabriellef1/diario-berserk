import { z } from 'zod'

/**
 * Um capítulo da edição. O resumo é texto próprio (escrito pela IA, com palavras
 * próprias) e só pode citar o que acontece nesse capítulo ou antes dele.
 */
export const chapterSchema = z.object({
  /** Estável e único na obra inteira: "c0-01" ... "c0-16", "c1" ... "c382". */
  id: z.string().regex(/^c(0-\d{2}|\d{1,3})$/),
  /** Como aparece pra ele: "0-01" ou "17". */
  number: z.string().regex(/^(0-\d{2}|\d{1,3})$/),
  /** Título curto, em português. */
  title: z.string().trim().min(1).max(80),
  /** O título entrega algo: mostra só o número até ele ler. */
  hideTitleUntilRead: z.boolean().optional(),
  /** 3 a 5 frases, tom de recap, sem antecipar nada. */
  summary: z.string().trim().min(40).max(1200),
  /** Resumo mínimo por falta de segurança: a Gabs revisa. */
  needsReview: z.boolean().optional(),
})

export const volumeChaptersSchema = z.object({
  volume: z.number().int().min(1).max(999),
  chapters: z.array(chapterSchema).min(1),
})

export type Chapter = z.infer<typeof chapterSchema>
export type VolumeChapters = z.infer<typeof volumeChaptersSchema>

/** Parte numérica do capítulo e se é da numeração inicial ("0-xx"). */
export function chapterNumber(number: string): { n: number; prologue: boolean } {
  const prologue = number.startsWith('0-')
  return { n: Number(prologue ? number.slice(2) : number), prologue }
}
