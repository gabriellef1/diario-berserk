import { describe, expect, it } from 'vitest'
import { at, makeState, run } from '@/test/domain'
import { introKind, introLine } from './intro'

const today = '2026-11-10'

describe('entrada', () => {
  it('completa uma vez por dia, curta nas outras aberturas do mesmo dia', () => {
    const s = makeState()
    expect(introKind(s, today)).toBe('full')
    const shown = run(s, { type: 'introShown', day: today, kind: 'full' })
    expect(introKind(shown, today)).toBe('short')
    expect(introKind(shown, '2026-11-11')).toBe('full')
  })

  it('pular também conta como mostrada (registro é no começo)', () => {
    const s = run(makeState(), { type: 'introShown', day: today, kind: 'full' })
    expect(s.intro.lastFullDay).toBe(today)
  })

  it('configuração "sempre curta" e "desligada" são respeitadas', () => {
    const s = makeState()
    expect(introKind(run(s, { type: 'setSettings', patch: { intro: 'short' } }), today)).toBe(
      'short',
    )
    expect(introKind(run(s, { type: 'setSettings', patch: { intro: 'off' } }), today)).toBe('off')
  })

  it('a entrada curta não gasta a completa do dia', () => {
    const s = run(makeState(), { type: 'introShown', day: today, kind: 'short' })
    expect(introKind(s, today)).toBe('full')
  })

  it('terminar um volume agenda a comemoração, que é consumida uma vez', () => {
    const s = run(makeState({ currentVolume: 2, position: null, owned: [] }), {
      type: 'finishVolume',
      at: at(2026, 11, 9),
    })
    expect(introLine(s, today)).toEqual({ kind: 'celebrate', text: 'volume 2 concluído' })
    const after = run(s, { type: 'introShown', day: today, kind: 'short' })
    expect(introLine(after, today)).toEqual({ kind: 'progress', text: 'volume 3 te esperando' })
  })

  it('aniversário só no dia e só com mensagem; vazia não aparece', () => {
    const s = makeState()
    const ann = { day: '06-02', message: ' te amo ' }
    expect(introLine(s, '2027-06-02', ann)).toEqual({ kind: 'anniversary', text: 'te amo' })
    expect(introLine(s, '2027-06-03', ann).kind).toBe('progress')
    expect(introLine(s, '2027-06-02', { day: '06-02', message: '   ' }).kind).toBe('progress')
  })

  it('aniversário tem prioridade sobre a comemoração', () => {
    const s = run(makeState({ currentVolume: 2, position: null, owned: [] }), {
      type: 'finishVolume',
      at: at(2026, 11, 9),
    })
    expect(introLine(s, '2027-06-02', { day: '06-02', message: 'oi' }).kind).toBe('anniversary')
  })

  it('a linha de progresso nunca cita conteúdo: só números de volume e frases fixas', () => {
    const allowed =
      /^(sua jornada começa aqui|volume \d+ te esperando|volume \d+ concluído|em dia\. o volume \d+ vem em breve|coleção inteira lida)$/
    const states = [
      makeState(),
      makeState({ currentVolume: 7, position: { kind: 'page', value: 30 }, owned: [] }),
      run(makeState({ currentVolume: 42, position: null, owned: [] }), {
        type: 'finishVolume',
        at: at(2026, 11, 9),
      }),
      run(
        makeState({ currentVolume: 42, position: null, owned: [] }),
        { type: 'finishVolume', at: at(2026, 11, 9) },
        { type: 'introShown', day: today, kind: 'short' },
      ),
    ]
    for (const s of states) expect(introLine(s, today).text).toMatch(allowed)
  })
})
