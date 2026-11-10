import { describe, expect, it } from 'vitest'
import type { VolumeChapters } from '@/data/chapters/types'
import type { Position } from './schema'
import { at, makeState, run } from '@/test/domain'
import { chapterViews, lastReadChapter, loadReadableVolume, readChapterCount } from './chapters'
import { parseBackup, toBackup } from './storage'

const ch = (number: string, extra: Partial<VolumeChapters['chapters'][number]> = {}) => ({
  id: `c${number}`,
  number,
  title: `Título ${number}`,
  summary: `Resumo do capítulo ${number}. Segunda frase do recap. Terceira frase pra fechar.`,
  ...extra,
})

/** Volume 2 fictício com 4 capítulos (números globais 4 a 7). */
const vol2: VolumeChapters = {
  volume: 2,
  chapters: [ch('4'), ch('5', { hideTitleUntilRead: true }), ch('6'), ch('7')],
}
const vol3: VolumeChapters = { volume: 3, chapters: [ch('8'), ch('9')] }
const p = (value: number) => ({ kind: 'page' as const, value })

function v2(position: Position | null = p(10)) {
  return makeState({ currentVolume: 2, position, owned: [1, 2] })
}

describe('gate de capítulos', () => {
  it('capítulo não lido não tem resumo nem título sensível; volume futuro não libera nada', () => {
    const views = chapterViews(v2(), vol2)
    expect(views.every((v) => !v.read && v.summary === undefined)).toBe(true)
    expect(views[1]?.title).toBeNull()
    expect(views[0]?.title).toBe('Título 4')
    expect(JSON.stringify(views)).not.toContain('Resumo')
    expect(readChapterCount(v2(), 3, vol3.chapters)).toBe(0)
    expect(chapterViews(v2(), vol3).some((v) => v.read)).toBe(false)
  })

  it('marcar um capítulo marca os anteriores; desmarcar esconde ele e os seguintes', () => {
    const marked = run(v2(), { type: 'markChapter', volume: 2, index: 2, n: 6 })
    expect(chapterViews(marked, vol2).map((v) => v.read)).toEqual([true, true, true, false])
    expect(chapterViews(marked, vol2)[1]?.title).toBe('Título 5')
    expect(chapterViews(marked, vol2)[2]?.summary).toContain('Resumo do capítulo 6')
    const unmarked = run(marked, { type: 'unmarkChapter', volume: 2, index: 1, prevN: 4 })
    expect(chapterViews(unmarked, vol2).map((v) => v.read)).toEqual([true, false, false, false])
    expect(chapterViews(unmarked, vol2)[1]?.summary).toBeUndefined()
  })

  it('não dá pra marcar capítulo de volume futuro nem de volume já lido', () => {
    const s = v2()
    expect(run(s, { type: 'markChapter', volume: 3, index: 0, n: 8 })).toBe(s)
    expect(run(s, { type: 'markChapter', volume: 1, index: 0, n: 1 })).toBe(s)
  })

  it('progresso por capítulo marca automaticamente, e desmarcar recua a posição', () => {
    const s = run(v2(null), {
      type: 'setPosition',
      position: { kind: 'chapter', value: 5 },
      at: at(2026, 11, 1),
    })
    expect(readChapterCount(s, 2, vol2.chapters)).toBe(2)
    const back = run(s, { type: 'unmarkChapter', volume: 2, index: 1, prevN: 4 })
    expect(readChapterCount(back, 2, vol2.chapters)).toBe(1)
    expect(back.reader.position).toEqual({ kind: 'chapter', value: 4 })
  })

  it('numeração que reinicia ("0-16" → "1") não libera além do que ele marcou', () => {
    const vol5: VolumeChapters = { volume: 5, chapters: [ch('0-15'), ch('0-16'), ch('1'), ch('2')] }
    const s = run(
      makeState({ currentVolume: 5, position: { kind: 'chapter', value: 16 }, owned: [] }),
    )
    expect(readChapterCount(s, 5, vol5.chapters)).toBe(2)
    const s2 = run(
      makeState({ currentVolume: 5, position: { kind: 'chapter', value: 2 }, owned: [] }),
    )
    expect(readChapterCount(s2, 5, vol5.chapters)).toBe(0)
  })

  it('terminar o volume libera todos; voltar o progresso esquece as marcas do volume', () => {
    const done = run(
      v2(),
      { type: 'markChapter', volume: 2, index: 0, n: 4 },
      { type: 'finishVolume', at: at(2026, 11, 2) },
    )
    expect(chapterViews(done, vol2).every((v) => v.read && v.summary)).toBe(true)
    expect(chapterViews(done, vol3).some((v) => v.read)).toBe(false)
    const back = run(done, { type: 'jumpTo', volume: 2, position: p(1), at: at(2026, 11, 3) })
    expect(chapterViews(back, vol2).some((v) => v.read)).toBe(false)
  })

  it('"esconder resumos" tira o texto, mas mantém o status lido', () => {
    const s = run(
      v2(),
      { type: 'markChapter', volume: 2, index: 3, n: 7 },
      { type: 'setSettings', patch: { hideSummaries: true } },
    )
    const views = chapterViews(s, vol2)
    expect(views.every((v) => v.read && v.summary === undefined)).toBe(true)
  })

  it('resumo editado tem prioridade, só em capítulo lido, e pode voltar ao padrão', () => {
    const s = run(v2(), { type: 'markChapter', volume: 2, index: 0, n: 4 })
    const blocked = run(s, {
      type: 'editChapterSummary',
      id: 'c6',
      volume: 2,
      index: 2,
      n: 6,
      text: 'minha versão',
      at: at(2026, 11, 1),
    })
    expect(blocked).toBe(s)
    const edited = run(s, {
      type: 'editChapterSummary',
      id: 'c4',
      volume: 2,
      index: 0,
      n: 4,
      text: 'minha versão',
      at: at(2026, 11, 1),
    })
    expect(chapterViews(edited, vol2)[0]).toMatchObject({ summary: 'minha versão', edited: true })
    const reset = run(edited, { type: 'resetChapterSummary', id: 'c4' })
    expect(chapterViews(reset, vol2)[0]?.summary).toContain('Resumo do capítulo 4')
  })

  it('volume futuro nunca é carregado', async () => {
    expect(await loadReadableVolume(v2(), 3)).toBeNull()
  })

  it('export/import leva capítulos lidos e edições', () => {
    const s = run(
      v2(),
      { type: 'markChapter', volume: 2, index: 1, n: 5 },
      {
        type: 'editChapterSummary',
        id: 'c4',
        volume: 2,
        index: 0,
        n: 4,
        text: 'minha versão',
        at: at(2026, 11, 1),
      },
      { type: 'setSettings', patch: { intro: 'short' } },
    )
    const back = parseBackup(JSON.stringify(toBackup(s, at(2026, 11, 2))))
    expect(back.ok && back.state).toEqual(s)
  })

  it('"da última vez" respeita o gate e a configuração', async () => {
    const s = run(makeState({ currentVolume: 1, position: null, owned: [] }))
    // Volume 1 real existe no projeto? Só testamos o caminho que não depende dos dados: nada lido.
    expect(
      await lastReadChapter({ ...s, settings: { ...s.settings, hideSummaries: true } }),
    ).toBeNull()
  })
})
