import { config } from '@/config'
import type { DiaryState } from '@/domain/schema'

/**
 * Cliente da função /api/ask. A senha fica só neste aparelho (fora do diário
 * e do backup). O servidor recebe a pergunta e o ponto de leitura, nada mais.
 */
const PASSWORD_KEY = 'diario-berserk:senha'

export function getPassword(): string | null {
  try {
    return localStorage.getItem(PASSWORD_KEY)
  } catch {
    return null
  }
}

export function setPassword(value: string | null) {
  try {
    if (value) localStorage.setItem(PASSWORD_KEY, value)
    else localStorage.removeItem(PASSWORD_KEY)
  } catch {
    // Sem storage: pede a senha de novo na próxima vez.
  }
}

export type AskResult =
  { ok: true; answer: string } | { ok: false; reason: 'senha' | 'limite' | 'recusa' | 'falha' }

export async function askClaude(
  state: DiaryState,
  question: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AskResult> {
  const { currentVolume, position, caughtUp } = state.reader
  let res: Response
  try {
    res = await fetchImpl(config.askUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-diario-senha': password },
      body: JSON.stringify({ question, volume: currentVolume, position, caughtUp }),
    })
  } catch {
    return { ok: false, reason: 'falha' }
  }
  if (res.status === 401) return { ok: false, reason: 'senha' }
  if (res.status === 429) return { ok: false, reason: 'limite' }
  if (!res.ok) return { ok: false, reason: 'falha' }
  try {
    const data = (await res.json()) as { answer?: unknown; refused?: unknown }
    if (data.refused === true) return { ok: false, reason: 'recusa' }
    return typeof data.answer === 'string' && data.answer.trim()
      ? { ok: true, answer: data.answer.trim() }
      : { ok: false, reason: 'falha' }
  } catch {
    return { ok: false, reason: 'falha' }
  }
}
