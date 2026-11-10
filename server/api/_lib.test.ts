import { describe, expect, it } from 'vitest'
import { DailyLimit, SYSTEM_PROMPT, checkPassword, corsHeaders, parseAsk, userMessage } from './_lib.js'

describe('api/ask', () => {
  it('valida o pedido e recusa lixo', () => {
    expect(
      parseAsk({ question: 'o que é aquilo?', volume: 2, position: { kind: 'page', value: 87 } }),
    ).toEqual({
      ok: true,
      value: {
        question: 'o que é aquilo?',
        volume: 2,
        position: { kind: 'page', value: 87 },
        caughtUp: false,
      },
    })
    expect(parseAsk(null).ok).toBe(false)
    expect(parseAsk({ question: '', volume: 2 }).ok).toBe(false)
    expect(parseAsk({ question: 'x'.repeat(601), volume: 2 }).ok).toBe(false)
    expect(parseAsk({ question: 'oi?', volume: 0 }).ok).toBe(false)
    expect(parseAsk({ question: 'oi?', volume: 2, position: { kind: 'linha', value: 1 } }).ok).toBe(
      false,
    )
  })

  it('a mensagem leva só o ponto de leitura e a pergunta', () => {
    expect(
      userMessage({
        question: 'quem é ele?',
        volume: 2,
        position: { kind: 'page', value: 87 },
        caughtUp: false,
      }),
    ).toBe('Li até o volume 2, página 87.\n\nMinha dúvida: quem é ele?')
    expect(userMessage({ question: 'q?', volume: 5, position: null, caughtUp: true })).toContain(
      'fim do volume 5',
    )
    expect(userMessage({ question: 'q?', volume: 3, position: null, caughtUp: false })).toContain(
      'começo do volume',
    )
  })

  it('o prompt de sistema é fixo e traz a regra antispoiler', () => {
    expect(SYSTEM_PROMPT).toContain('Regra absoluta')
    expect(SYSTEM_PROMPT).toContain('em qual volume isso fica mais claro')
    expect(SYSTEM_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('senha: precisa existir dos dois lados e bater', () => {
    expect(checkPassword('abc', 'abc')).toBe(true)
    expect(checkPassword('abd', 'abc')).toBe(false)
    expect(checkPassword(null, 'abc')).toBe(false)
    expect(checkPassword('abc', undefined)).toBe(false)
    expect(checkPassword('', '')).toBe(false)
  })

  it('limite diário zera no dia seguinte', () => {
    const l = new DailyLimit(2)
    expect([l.take('2026-11-10'), l.take('2026-11-10'), l.take('2026-11-10')]).toEqual([
      true,
      true,
      false,
    ])
    expect(l.take('2026-11-11')).toBe(true)
  })

  it('CORS só libera a origem do site', () => {
    const allowed = ['https://gabriellef1.github.io']
    expect(
      corsHeaders('https://gabriellef1.github.io', allowed)['Access-Control-Allow-Origin'],
    ).toBe('https://gabriellef1.github.io')
    expect(
      corsHeaders('https://outro.site', allowed)['Access-Control-Allow-Origin'],
    ).toBeUndefined()
  })
})
