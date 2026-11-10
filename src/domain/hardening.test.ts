import { describe, expect, it, vi } from 'vitest'
import { returningDoubts, visibleDoubts, visibleNote } from './gates'
import { buildPrompt } from './prompt'
import type { DiaryState } from './schema'
import { STORAGE_KEY, load, parseBackup, toBackup } from './storage'
import { at, makeState, run } from '@/test/domain'

// Um teste por falha apontada na revisão do Codex.

const p = (value: number) => ({ kind: 'page' as const, value })

function v2withDoubt(): DiaryState {
  return run(makeState({ currentVolume: 2, position: p(10), owned: [1, 2] }), {
    type: 'addDoubt',
    id: 'd',
    text: 'pergunta',
    remindAt: 3,
    at: at(2026, 11, 1),
  })
}

describe('revisão do Codex', () => {
  it('1. editar uma dúvida mais à frente avança a marca: o texto novo some ao voltar', () => {
    const s = run(
      v2withDoubt(),
      { type: 'jumpTo', volume: 5, position: p(30), at: at(2026, 11, 2) },
      { type: 'editDoubt', id: 'd', text: 'SEGREDO do vol 5', remindAt: 3 },
      { type: 'jumpTo', volume: 2, position: p(10), at: at(2026, 11, 3) },
    )
    expect(visibleDoubts(s)).toHaveLength(0)
    expect(buildPrompt(s, visibleDoubts(s)[0]?.text ?? 'x')).not.toMatch(/SEGREDO/)
  })

  it('2. trocar página por capítulo no mesmo volume não libera o que foi escrito na página 150', () => {
    const s = run(
      makeState({ currentVolume: 3, position: p(150), owned: [1, 2, 3] }),
      { type: 'saveNote', volume: 3, text: 'SEGREDO', at: at(2026, 11, 1) },
      { type: 'setPosition', position: { kind: 'chapter', value: 1 }, at: at(2026, 11, 2) },
    )
    expect(visibleNote(s, 3)).toBeUndefined()
  })

  it('3. com resposta escondida, responder/reabrir/apagar não mexem na dúvida', () => {
    const base = run(
      v2withDoubt(),
      { type: 'jumpTo', volume: 5, position: p(30), at: at(2026, 11, 2) },
      { type: 'answerDoubt', id: 'd', text: 'resposta do vol 5', at: at(2026, 11, 2) },
      { type: 'jumpTo', volume: 2, position: p(10), at: at(2026, 11, 3) },
    )
    for (const action of [
      { type: 'answerDoubt', id: 'd', text: 'outra', at: at(2026, 11, 4) },
      { type: 'reopenDoubt', id: 'd' },
      { type: 'deleteDoubt', id: 'd' },
      { type: 'saveGptAnswer', id: 'd', text: 'colada', at: at(2026, 11, 4) },
    ] as const) {
      expect(run(base, action)).toBe(base)
    }
  })

  it('3. nota escrita mais à frente não é sobrescrita nem apagada', () => {
    const s = run(
      makeState({ currentVolume: 3, position: p(150), owned: [1, 2, 3] }),
      { type: 'saveNote', volume: 3, text: 'escrita na 150', at: at(2026, 11, 1) },
      { type: 'setPosition', position: p(100), at: at(2026, 11, 2) },
    )
    expect(run(s, { type: 'saveNote', volume: 3, at: at(2026, 11, 3) })).toBe(s)
    expect(run(s, { type: 'saveNote', volume: 3, text: 'nova', at: at(2026, 11, 3) })).toBe(s)
  })

  it('4. editar o texto mantendo o lembrete não faz a dúvida voltar de novo no mesmo volume', () => {
    const s = run(
      v2withDoubt(),
      { type: 'finishVolume', at: at(2026, 11, 2) },
      { type: 'doubtNotYet', id: 'd' },
      { type: 'editDoubt', id: 'd', text: 'pergunta reescrita', remindAt: 3 },
    )
    expect(returningDoubts(s)).toHaveLength(0)
  })

  it('4. adiar não reabre dúvida respondida', () => {
    const s = run(v2withDoubt(), { type: 'answerDoubt', id: 'd', text: 'r', at: at(2026, 11, 2) })
    const after = run(s, { type: 'postponeDoubt', id: 'd', remindAt: 6 })
    expect(after.doubts[0]?.status).toBe('answered')
  })

  it('6. backup com ids repetidos, edição desconhecida ou volume fora da edição é recusado', () => {
    const s = v2withDoubt()
    const dup = { ...s, doubts: [...s.doubts, ...s.doubts] }
    const far = { ...s, reader: { ...s.reader, currentVolume: 999 } }
    const ed = { ...s, editionId: 'inventada' }
    for (const bad of [dup, far, ed]) {
      expect(parseBackup(JSON.stringify(toBackup(bad, at(2026, 11, 5)))).ok).toBe(false)
    }
  })

  it('7. migração não regrava a chave principal se não conseguir guardar o original', () => {
    const { doubts: _d, notes: _n, achievementsSeen: _a, ...v1 } = makeState()
    const raw = JSON.stringify({ ...v1, schemaVersion: 1 })
    localStorage.setItem(STORAGE_KEY, raw)
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
      if (key.startsWith('diario-berserk:antes-v')) throw new Error('quota')
    })
    try {
      expect(load().status).toBe('ok')
      // Nenhuma gravação na chave principal: o original v1 continua lá.
      expect(spy.mock.calls.some(([key]) => key === STORAGE_KEY)).toBe(false)
    } finally {
      spy.mockRestore()
    }
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it('8. corrompido sem espaço pra cópia: load não lança e avisa que não preservou', () => {
    localStorage.setItem(STORAGE_KEY, '{quebrado')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    try {
      expect(load()).toMatchObject({ status: 'corrupt', preserved: false, raw: '{quebrado' })
    } finally {
      spy.mockRestore()
    }
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{quebrado')
  })
})
