import { describe, expect, it } from 'vitest'
import { at, makeState, run, T0 } from '@/test/domain'
import { localDay } from './dates'

describe('addProgress', () => {
  it('soma à posição atual e loga no dia local', () => {
    const late = at(2026, 11, 10, 23) // 23h local: em UTC já é dia 11
    const s = run(
      makeState({ currentVolume: 2, position: { kind: 'page', value: 10 } }),
      { type: 'addProgress', amount: 15, at: late },
      { type: 'addProgress', amount: 5, at: late },
    )
    expect(s.reader.position).toEqual({ kind: 'page', value: 30 })
    expect(localDay(late)).toBe('2026-11-10')
    expect(s.readingLog).toEqual({ '2026-11-10': 20 })
  })

  it('limita a pagesTotal e só loga o que foi lido de fato', () => {
    const s = run(
      makeState({ currentVolume: 2, position: { kind: 'page', value: 190 } }),
      { type: 'setPagesTotal', volume: 2, pagesTotal: 200 },
      { type: 'addProgress', amount: 50, at: T0 },
    )
    expect(s.reader.position).toEqual({ kind: 'page', value: 200 })
    expect(s.readingLog).toEqual({ '2026-11-10': 10 })
  })
})

describe('finishVolume', () => {
  it('avança pro próximo, fecha o atual e abre o próximo', () => {
    const fim = at(2026, 11, 12)
    const s = run(makeState({ currentVolume: 2, position: { kind: 'page', value: 40 } }), {
      type: 'finishVolume',
      at: fim,
    })
    expect(s.reader).toMatchObject({ currentVolume: 3, position: null, caughtUp: false })
    expect(s.volumes['2']).toEqual({ startedAt: T0, finishedAt: fim })
    expect(s.volumes['3']).toEqual({ startedAt: fim })
  })

  it('no último lançado (42) vira caughtUp e não passa pro 43', () => {
    let s = run(makeState({ currentVolume: 42 }), { type: 'finishVolume', at: T0 })
    expect(s.reader).toMatchObject({ currentVolume: 42, caughtUp: true })
    expect(s.volumes['43']).toBeUndefined()
    const again = run(s, { type: 'finishVolume', at: T0 })
    expect(again).toBe(s)
    s = run(s, { type: 'addProgress', amount: 10, at: T0 })
    expect(s).toBe(again)
  })
})

describe('jumpTo', () => {
  it('pra trás limpa início e fim dos volumes à frente, mantendo pagesTotal', () => {
    let s = makeState({ currentVolume: 2 })
    s = run(
      s,
      { type: 'setPagesTotal', volume: 3, pagesTotal: 210 },
      { type: 'finishVolume', at: at(2026, 11, 11) },
      { type: 'finishVolume', at: at(2026, 11, 12) },
      { type: 'finishVolume', at: at(2026, 11, 13) },
    )
    expect(s.reader.currentVolume).toBe(5)
    s = run(s, { type: 'jumpTo', volume: 2, position: { kind: 'page', value: 30 }, at: T0 })
    expect(s.reader).toMatchObject({
      currentVolume: 2,
      position: { kind: 'page', value: 30 },
      caughtUp: false,
    })
    expect(s.volumes['2']).toEqual({ startedAt: T0 })
    expect(s.volumes['3']).toEqual({ pagesTotal: 210 })
    expect(s.volumes['4']).toBeUndefined()
    expect(s.volumes['5']).toBeUndefined()
  })
})

describe('setCollection', () => {
  it('ignora volume não lançado (43)', () => {
    const s = makeState()
    const next = run(s, { type: 'setCollection', volume: 43, item: { status: 'have' } })
    expect(next).toBe(s)
    const ok = run(s, { type: 'setCollection', volume: 42, item: { status: 'have', price: 89.9 } })
    expect(ok.collection['42']).toEqual({ status: 'have', price: 89.9 })
  })
})

describe('saveNote', () => {
  it('recusa volume futuro', () => {
    const s = makeState({ currentVolume: 3 })
    expect(run(s, { type: 'saveNote', volume: 4, rating: 5, at: T0 })).toBe(s)
    expect(run(s, { type: 'saveNote', volume: 3, rating: 5, at: T0 }).notes['3']?.rating).toBe(5)
  })
})
