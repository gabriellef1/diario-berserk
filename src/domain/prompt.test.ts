import { describe, expect, it } from 'vitest'
import { makeState, run, T0 } from '@/test/domain'
import { buildPrompt } from './prompt'

describe('buildPrompt', () => {
  it('volume 2, página 87: frase exata e a pergunta', () => {
    const s = makeState({ currentVolume: 2, position: { kind: 'page', value: 87 } })
    const p = buildPrompt(s, '  quem é o cavaleiro?  ')
    expect(p).toContain('Li até o volume 2, página 87.')
    expect(p).toContain('Minha pergunta: quem é o cavaleiro?')
    expect(p).toContain('Panini, Edição de Luxo')
  })

  it('capítulo', () => {
    const s = makeState({ currentVolume: 4, position: { kind: 'chapter', value: 12 } })
    expect(buildPrompt(s, 'x')).toContain('Li até o volume 4, capítulo 12.')
  })

  it('sem posição', () => {
    const s = makeState({ currentVolume: 4 })
    expect(buildPrompt(s, 'x')).toContain('Estou no volume 4 (não marquei a página).')
  })

  it('caughtUp', () => {
    const s = run(makeState({ currentVolume: 42 }), { type: 'finishVolume', at: T0 })
    expect(buildPrompt(s, 'x')).toContain('Li até o fim do volume 42.')
  })

  it('usa o progresso ATUAL, não o de quando a dúvida foi feita', () => {
    let s = makeState({ currentVolume: 2, position: { kind: 'page', value: 10 } })
    s = run(
      s,
      { type: 'addDoubt', id: 'd', text: 'quem?', at: T0 },
      { type: 'finishVolume', at: T0 },
      { type: 'setPosition', position: { kind: 'page', value: 5 }, at: T0 },
    )
    const doubt = s.doubts[0]
    expect(doubt?.mark.volume).toBe(2)
    const p = buildPrompt(s, doubt?.text ?? '')
    expect(p).toContain('Li até o volume 3, página 5.')
    expect(p).not.toContain('volume 2')
  })
})
