import { currentSchema, SCHEMA_VERSION, type DiaryState } from './schema'

export const STORAGE_KEY = 'diario-berserk'
const BACKUP_PREFIX = 'diario-berserk:antes-v'
const CORRUPT_PREFIX = 'diario-berserk:corrompido:'

/**
 * Migrações: chave = versão de origem. Cada uma recebe o documento cru da
 * versão N e devolve o da N+1.
 */
export const migrations: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> =
  {
    // v2: dúvidas, anotações por volume e conquistas vistas.
    1: (doc) => ({ ...doc, schemaVersion: 2, doubts: [], notes: {}, achievementsSeen: [] }),
  }

export type ParseResult =
  | { ok: true; state: DiaryState; migratedFrom?: number }
  | { ok: false; reason: 'json' | 'future' | 'invalid' | 'no-version' }

/** Lê um documento cru (do storage ou de um backup), migra e valida. Não grava nada. */
export function parseDocument(raw: unknown, migrate = migrations): ParseResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, reason: 'invalid' }
  let doc = raw as Record<string, unknown>
  const version = doc.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'no-version' }
  }
  if (version > SCHEMA_VERSION) return { ok: false, reason: 'future' }
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const step = migrate[v]
    if (!step) return { ok: false, reason: 'invalid' }
    doc = step(doc)
  }
  const parsed = currentSchema.safeParse(doc)
  if (!parsed.success) return { ok: false, reason: 'invalid' }
  return version < SCHEMA_VERSION
    ? { ok: true, state: parsed.data, migratedFrom: version }
    : { ok: true, state: parsed.data }
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: DiaryState }
  | { status: 'corrupt'; reason: string }
  | { status: 'unavailable' }

function storage(): Storage | null {
  try {
    const s = window.localStorage
    const probe = '__diario_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

export function load(): LoadResult {
  const s = storage()
  if (!s) return { status: 'unavailable' }
  const raw = s.getItem(STORAGE_KEY)
  if (raw === null) return { status: 'empty' }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    s.setItem(`${CORRUPT_PREFIX}${Date.now()}`, raw)
    return { status: 'corrupt', reason: 'json' }
  }
  const result = parseDocument(json)
  if (!result.ok) {
    // Nunca sobrescreve o original: guarda uma cópia antes de qualquer coisa.
    s.setItem(`${CORRUPT_PREFIX}${Date.now()}`, raw)
    return { status: 'corrupt', reason: result.reason }
  }
  if (result.migratedFrom !== undefined) {
    s.setItem(`${BACKUP_PREFIX}${result.migratedFrom}`, raw)
    s.setItem(STORAGE_KEY, JSON.stringify(result.state))
  }
  return { status: 'ok', state: result.state }
}

export type SaveResult = 'saved' | 'error'

export function save(state: DiaryState): SaveResult {
  const s = storage()
  if (!s) return 'error'
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(state))
    return 'saved'
  } catch {
    return 'error'
  }
}

export function clearAll() {
  storage()?.removeItem(STORAGE_KEY)
}

// ---------- Backup ----------

export const BACKUP_APP = 'diario-berserk'

export interface BackupFile {
  app: typeof BACKUP_APP
  kind: 'backup-completo'
  exportedAt: string
  data: DiaryState
}

export function toBackup(state: DiaryState, at: string): BackupFile {
  return { app: BACKUP_APP, kind: 'backup-completo', exportedAt: at, data: state }
}

export function backupFileName(at: string) {
  return `diario-berserk-${at.slice(0, 10)}.json`
}

export type ImportResult = { ok: true; state: DiaryState } | { ok: false; message: string }

/** Valida um backup. Se falhar, quem chama não deve mexer nos dados atuais. */
export function parseBackup(text: string): ImportResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, message: 'Esse arquivo não é um backup válido (JSON quebrado).' }
  }
  if (typeof json !== 'object' || json === null || (json as { app?: unknown }).app !== BACKUP_APP) {
    return { ok: false, message: 'Esse arquivo não é um backup do diário.' }
  }
  const result = parseDocument((json as { data?: unknown }).data)
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === 'future'
          ? 'Esse backup veio de uma versão mais nova do diário. Atualize o app e tente de novo.'
          : 'O backup está incompleto ou foi alterado. Nada foi mudado.',
    }
  }
  return { ok: true, state: result.state }
}
