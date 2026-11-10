import { timingSafeEqual } from 'node:crypto'

/**
 * Lógica pura da função /api/ask: validação do pedido, prompt antispoiler,
 * senha e limite diário. Sem I/O, pra testar sem rede.
 */

export interface AskRequest {
  question: string
  volume: number
  position: { kind: 'page' | 'chapter'; value: number } | null
  caughtUp: boolean
}

export type Parsed = { ok: true; value: AskRequest } | { ok: false; error: string }

const MAX_QUESTION = 600

export function parseAsk(body: unknown): Parsed {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'corpo inválido' }
  const b = body as Record<string, unknown>
  const question = typeof b.question === 'string' ? b.question.trim() : ''
  if (question.length < 3) return { ok: false, error: 'pergunta vazia' }
  if (question.length > MAX_QUESTION) return { ok: false, error: 'pergunta longa demais' }
  const volume = b.volume
  if (typeof volume !== 'number' || !Number.isInteger(volume) || volume < 1 || volume > 99) {
    return { ok: false, error: 'volume inválido' }
  }
  let position: AskRequest['position'] = null
  if (b.position !== null && b.position !== undefined) {
    const p = b.position as Record<string, unknown>
    const kind = p.kind
    const value = p.value
    if (
      (kind !== 'page' && kind !== 'chapter') ||
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 5000
    ) {
      return { ok: false, error: 'posição inválida' }
    }
    position = { kind, value }
  }
  return { ok: true, value: { question, volume, position, caughtUp: b.caughtUp === true } }
}

/** Fixo (vai em cache): nada que muda por pedido entra aqui. */
export const SYSTEM_PROMPT = `Você responde dúvidas de um leitor que está lendo o mangá Berserk pela primeira vez, na edição brasileira da Panini (Edição de Luxo, com a mesma numeração de volumes da edição japonesa). A mensagem dele informa até onde ele leu.

Regra absoluta: use só o que a história já mostrou até esse ponto.
- Não mencione, não insinue e não confirme nada que aconteça depois: personagens que ainda não apareceram, mortes, traições, revelações, a verdadeira natureza de objetos, criaturas ou pessoas, nem que "algo importante ainda vai acontecer". Sem ironia dramática e sem pistas.
- Se a resposta completa depender do que vem depois, responda só a parte que já foi mostrada e diga em qual volume isso fica mais claro, sem adiantar o conteúdo. Se você não tiver certeza do volume, diga apenas que a história ainda vai voltar a isso.
- Se a própria pergunta pressupõe algo que ele ainda não deveria saber, não confirme nem negue: diga que isso ainda vai ser mostrado.
- Na dúvida sobre se algo já apareceu até ali, trate como futuro e não fale.

Estilo: português do Brasil, no máximo 4 frases curtas, tom de amigo que já leu e está guardando segredo. Sem listas, sem títulos, sem aviso de spoiler, sem citar falas do mangá.

Latency-sensitive; begin your visible answer immediately.`

export function userMessage(r: AskRequest): string {
  const where = r.caughtUp
    ? `Li até o fim do volume ${r.volume}.`
    : r.position
      ? `Li até o volume ${r.volume}, ${r.position.kind === 'page' ? 'página' : 'capítulo'} ${r.position.value}.`
      : `Estou no volume ${r.volume} (não marquei a página; considere o começo do volume).`
  return `${where}\n\nMinha dúvida: ${r.question}`
}

/** Comparação de senha em tempo constante. Sem senha configurada, ninguém passa. */
export function checkPassword(given: string | null, expected: string | undefined): boolean {
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Limite diário por instância da função (melhor esforço: instâncias novas
 * começam do zero). O teto de gasto de verdade fica no console da Anthropic.
 */
export class DailyLimit {
  private day = ''
  private count = 0
  constructor(private readonly max: number) {}

  take(today: string): boolean {
    if (today !== this.day) {
      this.day = today
      this.count = 0
    }
    if (this.count >= this.max) return false
    this.count++
    return true
  }
}

export function corsHeaders(
  origin: string | null,
  allowed: readonly string[],
): Record<string, string> {
  const ok = origin !== null && allowed.includes(origin)
  return {
    ...(ok ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-diario-senha',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
