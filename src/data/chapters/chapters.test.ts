import { describe, expect, it } from 'vitest'
import { expectedChapters, totalChapters } from './expected'
import { hasVolumeFile, importVolumeChapters } from './index'

/**
 * Valida os arquivos de capítulos contra o mapa da edição.
 * CHAPTER_VOLUMES="6-10" restringe a faixa (uso dos lotes em andamento).
 */
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
const range = env?.CHAPTER_VOLUMES?.match(/^(\d+)-(\d+)$/)
const from = range ? Number(range[1]) : 1
const to = range ? Number(range[2]) : 43
const volumes = Object.keys(expectedChapters)
  .map(Number)
  .filter((v) => v >= from && v <= to)

/** Frases que antecipam ou insinuam o futuro: proibidas no resumo. */
const futureHints =
  /\b(mais tarde|futuramente|no futuro|vai ser|viria a|iria|mal sabia|sem saber que|ainda n[aã]o sabe|um dia (ele|ela)|isso (vai|ser[aá]) importante|at[eé] que um dia|pela primeira vez.*(mas n[aã]o a [uú]ltima)|n[aã]o ser[aá] a [uú]ltima|destinad[oa]|prenúncio|press[aá]gio|anuncia o que|o que est[aá] por vir|spoiler)\b/i

describe('mapa de capítulos', () => {
  it('cobre a edição inteira (43 volumes, 397 capítulos)', () => {
    expect(Object.keys(expectedChapters)).toHaveLength(43)
    expect(totalChapters).toBe(397)
  })

  it.each(volumes)('volume %i tem arquivo e bate com o mapa', async (volume) => {
    expect(
      hasVolumeFile(volume),
      `falta src/data/chapters/vol-${String(volume).padStart(2, '0')}.ts`,
    ).toBe(true)
    const data = await importVolumeChapters(volume)
    expect(data, 'arquivo inválido (schema ou volume errado)').not.toBeNull()
    if (!data) return
    const numbers = data.chapters.map((c) => c.number)
    expect(numbers).toEqual(expectedChapters[volume])
    for (const c of data.chapters) {
      expect(c.id).toBe(`c${c.number}`)
      expect(
        c.summary.split(/[.!?]\s/).length,
        `resumo curto demais: ${c.id}`,
      ).toBeGreaterThanOrEqual(2)
      expect(c.summary, `insinua o futuro: ${c.id}`).not.toMatch(futureHints)
      expect(c.summary, `cita capítulo/volume: ${c.id}`).not.toMatch(/\b(cap[ií]tulo|volume) \d/i)
    }
  })

  it('ids são únicos na obra inteira', async () => {
    const seen = new Set<string>()
    for (const volume of volumes) {
      const data = await importVolumeChapters(volume)
      for (const c of data?.chapters ?? []) {
        expect(seen.has(c.id), `id repetido: ${c.id}`).toBe(false)
        seen.add(c.id)
      }
    }
  })
})
