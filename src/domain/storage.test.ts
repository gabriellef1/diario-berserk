import { describe, expect, it } from 'vitest'
import { at, makeState, run, T0 } from '@/test/domain'
import type { DiaryState } from './schema'
import { load, parseBackup, save, STORAGE_KEY, toBackup } from './storage'

const CORRUPT_PREFIX = 'diario-berserk:corrompido:'

function storedKeys(): string[] {
  return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '')
}

function v1Doc() {
  const {
    doubts: _d,
    notes: _n,
    achievementsSeen: _a,
    ...rest
  } = run(
    makeState({ currentVolume: 3, owned: [1, 2, 3], position: { kind: 'page', value: 12 } }),
    { type: 'addProgress', amount: 8, at: T0 },
  )
  return { ...rest, schemaVersion: 1 }
}

function richState(): DiaryState {
  return run(
    makeState({ currentVolume: 2, owned: [1, 2], position: { kind: 'page', value: 20 } }),
    {
      type: 'setCollection',
      volume: 3,
      item: { status: 'have', price: 89.9, boughtAt: '2026-11-09' },
    },
    { type: 'setCollection', volume: 4, item: { status: 'want' } },
    { type: 'setPagesTotal', volume: 2, pagesTotal: 200 },
    { type: 'addProgress', amount: 30, at: at(2026, 11, 9) },
    { type: 'addDoubt', id: 'd1', text: 'quem é o cavaleiro?', remindAt: 4, at: T0 },
    { type: 'addDoubt', id: 'd2', text: 'o que é aquilo?', at: T0 },
    { type: 'saveNote', volume: 2, rating: 4, reaction: 'arrepio', text: 'forte', at: T0 },
    { type: 'finishVolume', at: at(2026, 11, 11) },
    { type: 'answerDoubt', id: 'd1', text: 'é o protagonista', at: at(2026, 11, 11) },
    { type: 'saveGptAnswer', id: 'd1', text: 'resposta colada', at: at(2026, 11, 11) },
    { type: 'doubtNotYet', id: 'd2' },
    { type: 'markAchievementsSeen', ids: ['primeiro-marco'] },
  )
}

describe('migração v1 -> v2', () => {
  it('vira v2 com campos novos vazios e guarda o original em antes-v1', () => {
    const raw = JSON.stringify(v1Doc())
    localStorage.setItem(STORAGE_KEY, raw)

    const result = load()
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.state).toMatchObject({
      schemaVersion: 3,
      doubts: [],
      notes: {},
      achievementsSeen: [],
      chaptersRead: {},
      chapterEdits: {},
      settings: { hideSummaries: false, intro: 'auto', atmosphere: true },
      intro: {},
      reader: { currentVolume: 3, position: { kind: 'page', value: 20 } },
      readingLog: { '2026-11-10': 8 },
    })
    expect(localStorage.getItem('diario-berserk:antes-v1')).toBe(raw)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual(result.state)
  })
})

describe('load com dado ruim', () => {
  it('JSON corrompido: corrupt, cópia em corrompido:*, sem apagar o original', () => {
    localStorage.setItem(STORAGE_KEY, '{"schemaVersion": 2, quebrado')
    expect(load()).toMatchObject({ status: 'corrupt', reason: 'json', preserved: true })
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"schemaVersion": 2, quebrado')
    const copies = storedKeys().filter((k) => k.startsWith(CORRUPT_PREFIX))
    expect(copies).toHaveLength(1)
    expect(localStorage.getItem(copies[0] ?? '')).toBe('{"schemaVersion": 2, quebrado')
  })

  it('versão futura (99): corrupt/future sem sobrescrever', () => {
    const raw = JSON.stringify({ ...makeState(), schemaVersion: 99 })
    localStorage.setItem(STORAGE_KEY, raw)
    expect(load()).toMatchObject({ status: 'corrupt', reason: 'future', preserved: true })
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
    expect(storedKeys().some((k) => k.startsWith(CORRUPT_PREFIX))).toBe(true)
  })
})

describe('parseBackup inválido', () => {
  const expectFail = (text: string) => {
    const r = parseBackup(text)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.message.length).toBeGreaterThan(0)
    return r.message
  }

  it('JSON quebrado', () => {
    expect(expectFail('{oops')).toMatch(/JSON quebrado/)
  })

  it('app errado', () => {
    const file = { ...toBackup(makeState(), T0), app: 'outro-app' }
    expect(expectFail(JSON.stringify(file))).toMatch(/não é um backup do diário/)
  })

  it('data adulterada', () => {
    const file = toBackup(makeState(), T0)
    const tampered = {
      ...file,
      data: { ...file.data, reader: { ...file.data.reader, currentVolume: -1 } },
    }
    expect(expectFail(JSON.stringify(tampered))).toMatch(/incompleto ou foi alterado/)
  })
})

describe('roundtrip de backup', () => {
  it('estado rico -> toBackup -> JSON -> clear -> parseBackup -> save -> load = original', () => {
    const original = richState()
    // Garante que o estado é mesmo "rico".
    expect(original.doubts.find((d) => d.id === 'd1')).toMatchObject({
      status: 'answered',
      answer: { text: 'é o protagonista' },
      gptAnswer: { text: 'resposta colada' },
    })
    expect(original.notes['2']).toBeDefined()
    expect(original.collection['3']).toEqual({
      status: 'have',
      price: 89.9,
      boughtAt: '2026-11-09',
    })
    expect(Object.keys(original.readingLog).length).toBeGreaterThan(0)

    const text = JSON.stringify(toBackup(original, T0))
    localStorage.clear()
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(save(parsed.state)).toBe('saved')
    const loaded = load()
    expect(loaded).toEqual({ status: 'ok', state: original })
  })
})
