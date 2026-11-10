import { describe, expect, it } from 'vitest'
import { makeState, run, T0 } from '@/test/domain'
import { buyWarning, collectionPercent, nextToBuy } from './collection'
import type { DiaryState } from './schema'

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

describe('nextToBuy', () => {
  it('a partir do volume atual, pula os que ele já tem', () => {
    const s = makeState({ currentVolume: 3, owned: [1, 2, 3, 4, 6] })
    expect(nextToBuy(s)).toBe(5)
  })

  it('nunca retorna o 43 (em breve) e devolve null se tem tudo até 42', () => {
    const s = makeState({ currentVolume: 40, owned: range(1, 42) })
    expect(nextToBuy(s)).toBeNull()
    const missing42 = makeState({ currentVolume: 40, owned: range(1, 41) })
    expect(nextToBuy(missing42)).toBe(42)
  })
})

describe('collectionPercent', () => {
  it('calcula sobre os 42 lançados; o 43 não conta', () => {
    const half = makeState({ owned: range(1, 21) })
    expect(collectionPercent(half)).toBe(50)
    const forced: DiaryState = {
      ...makeState({ owned: range(1, 42) }),
      collection: {
        ...makeState({ owned: range(1, 42) }).collection,
        '43': { status: 'have' },
      },
    }
    expect(collectionPercent(forced)).toBe(100)
  })
})

describe('buyWarning', () => {
  const reading = (page: number) =>
    run(makeState({ currentVolume: 5, owned: [5], position: { kind: 'page', value: page } }), {
      type: 'setPagesTotal',
      volume: 5,
      pagesTotal: 200,
    })

  it('low-pages: 200 páginas, na 170, sem o próximo -> faltam 30', () => {
    expect(buyWarning(reading(170))).toEqual({ kind: 'low-pages', volume: 6, pagesLeft: 30 })
  })

  it('missing-next: longe do fim e sem o próximo', () => {
    expect(buyWarning(reading(100))).toEqual({ kind: 'missing-next', volume: 6 })
  })

  it('sem aviso se já tem o próximo', () => {
    const s = run(reading(170), {
      type: 'setCollection',
      volume: 6,
      item: { status: 'have', boughtAt: T0.slice(0, 10) },
    })
    expect(buyWarning(s)).toBeNull()
  })
})
