import { describe, expect, it, vi } from 'vitest'
import { at, makeState, run } from '@/test/domain'
import { askClaude } from './claudeClient'

function state() {
  return run(
    makeState({ currentVolume: 2, position: { kind: 'page', value: 87 }, owned: [1, 2] }),
    { type: 'saveNote', volume: 2, text: 'ANOTACAO-PRIVADA', at: at(2026, 11, 1) },
    { type: 'addDoubt', id: 'd', text: 'DUVIDA-ANTIGA', at: at(2026, 11, 1) },
  )
}

const reply = (status: number, body: unknown) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe('cliente do Claude', () => {
  it('manda só a pergunta e o ponto de leitura, com a senha no header', async () => {
    const f = reply(200, { answer: 'resposta' })
    expect(await askClaude(state(), 'o que é aquilo?', 'segredo', f)).toEqual({
      ok: true,
      answer: 'resposta',
    })
    const [, init] = f.mock.calls[0] ?? []
    const raw = typeof init?.body === 'string' ? init.body : ''
    const body = JSON.parse(raw) as unknown
    expect(body).toEqual({
      question: 'o que é aquilo?',
      volume: 2,
      position: { kind: 'page', value: 87 },
      caughtUp: false,
    })
    expect(raw).not.toMatch(/ANOTACAO-PRIVADA|DUVIDA-ANTIGA/)
    expect(new Headers(init?.headers).get('x-diario-senha')).toBe('segredo')
  })

  it('traduz senha errada, limite, recusa e falha de rede', async () => {
    expect(await askClaude(state(), 'q?', 'x', reply(401, {}))).toEqual({
      ok: false,
      reason: 'senha',
    })
    expect(await askClaude(state(), 'q?', 'x', reply(429, {}))).toEqual({
      ok: false,
      reason: 'limite',
    })
    expect(await askClaude(state(), 'q?', 'x', reply(200, { refused: true }))).toEqual({
      ok: false,
      reason: 'recusa',
    })
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'))
    expect(await askClaude(state(), 'q?', 'x', offline)).toEqual({ ok: false, reason: 'falha' })
  })
})
