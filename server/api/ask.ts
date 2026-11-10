import Anthropic from '@anthropic-ai/sdk'
import {
  DailyLimit,
  SYSTEM_PROMPT,
  checkPassword,
  corsHeaders,
  parseAsk,
  userMessage,
} from './_lib.js'

/**
 * POST /api/ask: o Claude responde uma dúvida sem spoiler.
 * Variáveis de ambiente (painel da Vercel, nunca no código):
 * - ANTHROPIC_API_KEY: chave da API
 * - DIARIO_SENHA: senha que o app manda no header x-diario-senha
 * - ALLOWED_ORIGINS (opcional): origens aceitas, separadas por vírgula
 */
export const config = { maxDuration: 60 }

const MODEL = 'claude-opus-5'
const limit = new DailyLimit(30)
const client = new Anthropic()

const allowed = (process.env.ALLOWED_ORIGINS ?? 'https://gabriellef1.github.io')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function json(status: number, body: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'content-type': 'application/json; charset=utf-8' },
  })
}

export function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin'), allowed),
  })
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get('origin'), allowed)
  if (!checkPassword(req.headers.get('x-diario-senha'), process.env.DIARIO_SENHA)) {
    return json(401, { error: 'senha' }, cors)
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'json' }, cors)
  }
  const parsed = parseAsk(body)
  if (!parsed.ok) return json(400, { error: parsed.error }, cors)
  const today = new Date().toISOString().slice(0, 10)
  if (!limit.take(today)) return json(429, { error: 'limite' }, cors)

  try {
    // Fallback de recusa no servidor (padrão recomendado pro Opus 5).
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage(parsed.value) }],
    })
    if (response.stop_reason === 'refusal') return json(200, { answer: null, refused: true }, cors)
    const answer = response.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()
    return json(200, { answer, model: response.model }, cors)
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json(429, { error: 'ocupado' }, cors)
    if (error instanceof Anthropic.AuthenticationError) return json(500, { error: 'chave' }, cors)
    if (error instanceof Anthropic.APIError) return json(502, { error: 'api' }, cors)
    return json(500, { error: 'interno' }, cors)
  }
}
