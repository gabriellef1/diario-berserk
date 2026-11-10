import { describe, expect, it } from 'vitest'
import { at, makeState } from '@/test/domain'
import type { DiaryState } from './schema'
import { bestStreak, pagesPerDay, streak } from './stats'

const withLog = (readingLog: DiaryState['readingLog']): DiaryState => ({
  ...makeState(),
  readingLog,
})

// Dias 1, 2, 3 (sequência de 3), buraco no 4, 5 com zero, 7, 8, 9, 10 (sequência de 4).
const log = withLog({
  '2026-11-01': 10,
  '2026-11-02': 10,
  '2026-11-03': 10,
  '2026-11-05': 0,
  '2026-11-07': 20,
  '2026-11-08': 20,
  '2026-11-09': 20,
  '2026-11-10': 20,
})

describe('streak', () => {
  it('conta dias seguidos até hoje', () => {
    expect(streak(log, at(2026, 11, 10))).toBe(4)
  })

  it('usa o dia local: 23h do dia 10 ainda é dia 10', () => {
    expect(streak(log, at(2026, 11, 10, 23))).toBe(4)
    expect(streak(log, at(2026, 11, 10, 0))).toBe(4)
  })

  it('se hoje ainda não leu, conta até ontem', () => {
    expect(streak(log, at(2026, 11, 11))).toBe(4)
  })

  it('zera depois de um dia inteiro sem ler', () => {
    expect(streak(log, at(2026, 11, 12))).toBe(0)
  })

  it('dia com 0 páginas não conta', () => {
    expect(streak(withLog({ '2026-11-09': 0, '2026-11-10': 5 }), at(2026, 11, 10))).toBe(1)
  })
})

describe('bestStreak', () => {
  it('maior sequência, atravessando virada de mês', () => {
    expect(bestStreak(log)).toBe(4)
    expect(
      bestStreak(withLog({ '2026-10-30': 1, '2026-10-31': 1, '2026-11-01': 1, '2026-11-03': 1 })),
    ).toBe(3)
  })

  it('vazio é 0', () => {
    expect(bestStreak(withLog({}))).toBe(0)
  })
})

describe('pagesPerDay', () => {
  it('total dividido pelos dias desde o primeiro registro, contando hoje', () => {
    // 110 páginas de 01 a 10 = 10 dias.
    expect(pagesPerDay(log, at(2026, 11, 10))).toBe(11)
  })

  it('null sem registro', () => {
    expect(pagesPerDay(withLog({}), at(2026, 11, 10))).toBeNull()
  })
})
