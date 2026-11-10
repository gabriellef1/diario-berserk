import { describe, expect, it } from 'vitest'
import { at, makeState, run, T0 } from '@/test/domain'
import { achievements } from './achievements'
import { cardAttributes } from './card'
import { isVisible, visibleDoubts, visibleNote, type Mark } from './gates'

const page = (value: number) => ({ kind: 'page' as const, value })
const chapter = (value: number) => ({ kind: 'chapter' as const, value })
const mark = (volume: number, position: Mark['position'] = null, caughtUp?: boolean): Mark =>
  caughtUp === undefined ? { volume, position } : { volume, position, caughtUp }

describe('isVisible', () => {
  it('volume menor aparece, volume maior some', () => {
    expect(isVisible(mark(2, page(999)), mark(3, page(1)))).toBe(true)
    expect(isVisible(mark(4, page(1)), mark(3, page(999)))).toBe(false)
  })

  it('mesmo volume: decide pela página', () => {
    expect(isVisible(mark(3, page(100)), mark(3, page(100)))).toBe(true)
    expect(isVisible(mark(3, page(99)), mark(3, page(100)))).toBe(true)
    expect(isVisible(mark(3, page(101)), mark(3, page(100)))).toBe(false)
  })

  it('mesmo volume em unidades diferentes: o volume decide', () => {
    expect(isVisible(mark(3, chapter(50)), mark(3, page(1)))).toBe(true)
  })

  it('progresso sem posição esconde o que foi escrito num ponto marcado do mesmo volume', () => {
    expect(isVisible(mark(3, page(150)), mark(3, null))).toBe(false)
    expect(isVisible(mark(3, null), mark(3, null))).toBe(true)
  })

  it('caughtUp: progresso no fim mostra tudo do volume; marca no fim some pra quem está no meio', () => {
    expect(isVisible(mark(3, page(500), true), mark(3, page(10), true))).toBe(true)
    expect(isVisible(mark(3, page(1), true), mark(3, page(999)))).toBe(false)
  })
})

describe('visibleDoubts', () => {
  it('esconde dúvida feita num volume à frente depois de jumpTo pra trás', () => {
    let s = makeState({ currentVolume: 5 })
    s = run(
      s,
      { type: 'addDoubt', id: 'd5', text: 'quem é ele?', at: T0 },
      { type: 'jumpTo', volume: 3, position: null, at: T0 },
    )
    expect(s.doubts).toHaveLength(1)
    expect(visibleDoubts(s)).toEqual([])
  })

  it('resposta escrita no vol 5 de dúvida do vol 2 some ao voltar pro vol 3, e a dúvida volta a ficar aberta', () => {
    let s = makeState({ currentVolume: 2 })
    s = run(
      s,
      { type: 'addDoubt', id: 'd2', text: 'por que ele fez isso?', at: T0 },
      { type: 'jumpTo', volume: 5, position: null, at: T0 },
      { type: 'answerDoubt', id: 'd2', text: 'agora entendi', at: T0 },
      { type: 'saveGptAnswer', id: 'd2', text: 'resposta do gpt', at: T0 },
      { type: 'jumpTo', volume: 3, position: null, at: T0 },
    )
    const [d] = visibleDoubts(s)
    expect(d?.id).toBe('d2')
    expect(d?.status).toBe('open')
    expect(d).not.toHaveProperty('answer')
    expect(d).not.toHaveProperty('gptAnswer')
    // O dado original continua guardado.
    expect(s.doubts[0]?.status).toBe('answered')
  })
})

describe('visibleNote', () => {
  it('esconde nota de volume futuro', () => {
    let s = makeState({ currentVolume: 4 })
    s = run(
      s,
      { type: 'saveNote', volume: 4, rating: 5, at: T0 },
      { type: 'jumpTo', volume: 3, position: null, at: T0 },
    )
    expect(s.notes['4']).toBeDefined()
    expect(visibleNote(s, 4)).toBeUndefined()
  })

  it('esconde nota escrita mais à frente no mesmo volume (página 150 vs progresso 100)', () => {
    let s = makeState({ currentVolume: 3, position: page(150) })
    s = run(
      s,
      { type: 'saveNote', volume: 3, text: 'que cena', at: T0 },
      { type: 'setPosition', position: page(100), at: T0 },
    )
    expect(visibleNote(s, 3)).toBeUndefined()
    s = run(s, { type: 'setPosition', position: page(150), at: at(2026, 11, 11) })
    expect(visibleNote(s, 3)?.text).toBe('que cena')
  })
})

describe('contadores não contam dúvida escondida', () => {
  const hidden = () =>
    run(
      makeState({ currentVolume: 5 }),
      { type: 'addDoubt', id: 'd5', text: 'quem é ele?', at: T0 },
      { type: 'jumpTo', volume: 3, position: null, at: T0 },
    )
  const visible = () =>
    run(makeState({ currentVolume: 3 }), {
      type: 'addDoubt',
      id: 'd3',
      text: 'quem é ele?',
      at: T0,
    })
  const primeiraDuvida = achievements.find((a) => a.id === 'primeira-duvida')

  it('curiosidade da ficha', () => {
    expect(cardAttributes(hidden(), T0).curiosidade).toBe(40)
    expect(cardAttributes(visible(), T0).curiosidade).toBeGreaterThan(40)
  })

  it("conquista 'primeira-duvida'", () => {
    expect(primeiraDuvida?.unlocked(hidden())).toBe(false)
    expect(primeiraDuvida?.unlocked(visible())).toBe(true)
  })
})
