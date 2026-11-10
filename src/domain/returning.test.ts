import { describe, expect, it } from 'vitest'
import { at, makeState, run, T0 } from '@/test/domain'
import { returningDoubts } from './gates'

describe('dúvida que volta', () => {
  it('lembra no volume pedido, respeita "ainda não", adiamento e resposta', () => {
    const ids = (s: Parameters<typeof returningDoubts>[0]) => returningDoubts(s).map((d) => d.id)

    let s = run(makeState({ currentVolume: 2 }), {
      type: 'addDoubt',
      id: 'd1',
      text: 'o que era aquilo?',
      remindAt: 3,
      at: T0,
    })
    expect(ids(s)).toEqual([])

    s = run(s, { type: 'finishVolume', at: at(2026, 11, 11) })
    expect(s.reader.currentVolume).toBe(3)
    expect(ids(s)).toEqual(['d1'])

    s = run(s, { type: 'doubtNotYet', id: 'd1' })
    expect(ids(s)).toEqual([])

    s = run(s, { type: 'finishVolume', at: at(2026, 11, 12) })
    expect(s.reader.currentVolume).toBe(4)
    expect(ids(s)).toEqual(['d1'])

    s = run(s, { type: 'postponeDoubt', id: 'd1', remindAt: 6 })
    expect(ids(s)).toEqual([])
    s = run(s, { type: 'finishVolume', at: at(2026, 11, 13) })
    expect(s.reader.currentVolume).toBe(5)
    expect(ids(s)).toEqual([])
    s = run(s, { type: 'finishVolume', at: at(2026, 11, 14) })
    expect(s.reader.currentVolume).toBe(6)
    expect(ids(s)).toEqual(['d1'])

    s = run(s, { type: 'answerDoubt', id: 'd1', text: 'era o símbolo', at: at(2026, 11, 14) })
    expect(s.doubts[0]?.status).toBe('answered')
    expect(ids(s)).toEqual([])
    s = run(s, { type: 'finishVolume', at: at(2026, 11, 15) })
    expect(ids(s)).toEqual([])
  })
})
