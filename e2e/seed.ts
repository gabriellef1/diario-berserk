import type { Page } from '@playwright/test'

export const STORAGE_KEY = 'diario-berserk'

const achievementIds = [
  'primeiro-marco',
  'cinco-marcos',
  'primeira-duvida',
  'duvida-resolvida',
  'sete-dias',
  'trinta-dias',
  'estante-5',
  'estante-20',
]

/** Estado v3 mínimo: volume 2, página 87, volumes 1 e 2 na estante. */
export function seedState(overrides: Record<string, unknown> = {}) {
  const at = '2026-11-01T15:00:00.000Z'
  return {
    schemaVersion: 3,
    editionId: 'panini-luxo',
    createdAt: at,
    reader: {
      currentVolume: 2,
      position: { kind: 'page', value: 87 },
      trackBy: 'page',
      caughtUp: false,
    },
    volumes: { '1': { startedAt: at, finishedAt: at }, '2': { startedAt: at } },
    collection: { '1': { status: 'have' }, '2': { status: 'have' } },
    readingLog: {},
    doubts: [],
    notes: {},
    achievementsSeen: achievementIds,
    chaptersRead: {},
    chapterEdits: {},
    settings: { hideSummaries: false, intro: 'off', atmosphere: true },
    intro: {},
    ...overrides,
  }
}

/** Grava o estado antes de qualquer script da página e abre a rota. */
export async function openWith(page: Page, state: unknown, route = './') {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value)
    },
    { key: STORAGE_KEY, value: JSON.stringify(state) },
  )
  await page.goto(route)
}

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}
