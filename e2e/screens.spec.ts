import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

// Gera screenshots de todas as telas. Só roda com SCREENSHOT_DIR setado
// (node scripts/screens.mjs). No CI fica de fora.
const dir = process.env.SCREENSHOT_DIR

test.skip(!dir, 'SCREENSHOT_DIR não setado')

const STORAGE_KEY = 'diario-berserk'

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

function day(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dd}`
}

function iso(offset: number) {
  return new Date(Date.now() - offset * 86_400_000).toISOString()
}

/** Estado v2 realista: lendo o volume 2, página 87, com 1 e 2 na estante. */
function sampleState() {
  return {
    schemaVersion: 2,
    editionId: 'panini-luxo',
    createdAt: iso(12),
    reader: {
      currentVolume: 2,
      position: { kind: 'page', value: 87 },
      trackBy: 'page',
      caughtUp: false,
    },
    volumes: {
      '1': { startedAt: iso(12), finishedAt: iso(5), pagesTotal: 224 },
      '2': { startedAt: iso(5), pagesTotal: 232 },
    },
    collection: {
      '1': { status: 'have', price: 44.9, boughtAt: day(14) },
      '2': { status: 'have', price: 44.9, boughtAt: day(6) },
      '3': { status: 'want' },
    },
    readingLog: {
      [day(12)]: 30,
      [day(10)]: 42,
      [day(8)]: 55,
      [day(6)]: 60,
      [day(5)]: 37,
      [day(3)]: 28,
      [day(2)]: 25,
      [day(1)]: 18,
      [day(0)]: 16,
    },
    doubts: [
      {
        id: 'd3',
        text: 'por que ele carrega aquilo pra todo lado?',
        askedAt: iso(1),
        mark: { volume: 2, position: { kind: 'page', value: 80 } },
        remindAt: 3,
        status: 'open',
      },
      {
        id: 'd2',
        text: 'o que é aquilo que fica aparecendo?',
        askedAt: iso(8),
        mark: { volume: 1, position: { kind: 'page', value: 150 } },
        remindAt: 2,
        status: 'open',
      },
      {
        id: 'd1',
        text: 'quem era aquele cara no começo?',
        askedAt: iso(11),
        mark: { volume: 1, position: { kind: 'page', value: 40 } },
        status: 'answered',
        answer: {
          text: 'ficou claro no fim do volume 1, era alguém do passado dele',
          at: iso(6),
          mark: { volume: 1, position: { kind: 'page', value: 220 } },
        },
        gptAnswer: {
          text: 'Isso fica mais claro mais pra frente, no volume 1 mesmo.',
          at: iso(10),
          mark: { volume: 1, position: { kind: 'page', value: 41 } },
        },
      },
    ],
    notes: {
      '1': {
        rating: 4,
        reaction: 'arrepio',
        text: 'começo pesado, mas prendeu',
        updatedAt: iso(5),
        mark: { volume: 1, position: null, caughtUp: true },
      },
    },
    achievementsSeen: achievementIds,
  }
}

async function shot(page: Page, name: string, fullPage = true) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  const project = test.info().project.name
  await page.screenshot({
    path: path.join(dir ?? '.', `${project}-${name}.png`),
    fullPage,
  })
}

test.describe('screenshots', () => {
  test('onboarding', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'Olá, Guilherme.' })).toBeVisible()
    await shot(page, 'onboarding-1')

    await page.getByRole('button', { name: 'Começar' }).click()
    await page.getByRole('button', { name: 'Próximo volume' }).click()
    await page.getByLabel('Em que página parou? (opcional)').fill('87')
    await shot(page, 'onboarding-2')

    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(
      page.getByRole('heading', { name: 'Quais volumes já estão na sua estante?' }),
    ).toBeVisible()
    await shot(page, 'onboarding-3')
  })

  test('telas do diário', async ({ page }) => {
    const state = JSON.stringify(sampleState())
    await page.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, value)
      },
      [STORAGE_KEY, state] as const,
    )

    await page.goto('./')
    await expect(page.locator('#lendo-agora')).toHaveText('Volume 2')
    await shot(page, 'hoje')
    await shot(page, 'hoje-tela', false)

    await page.goto('./#/jornada')
    await expect(page.getByRole('heading', { name: 'A estrada até aqui' })).toBeVisible()
    await shot(page, 'jornada')

    await page.locator('li[data-volume="1"] button').click()
    await expect(page.getByRole('dialog', { name: 'Volume 1' })).toBeVisible()
    await shot(page, 'jornada-volume')

    await page.goto('./#/duvidas')
    await expect(page.getByTestId('doubt-item').first()).toBeVisible()
    await shot(page, 'duvidas')

    await page
      .getByTestId('doubt-item')
      .first()
      .getByRole('button', { name: 'Perguntar sem spoiler' })
      .click()
    await expect(page.getByTestId('prompt-text')).toBeVisible()
    await shot(page, 'duvidas-ponte')

    await page.goto('./#/colecao')
    await expect(page.getByRole('heading', { name: 'Sua estante' })).toBeVisible()
    await shot(page, 'colecao')

    await page.getByRole('button', { name: 'Já comprei' }).click()
    await expect(page.getByRole('dialog', { name: 'Volume 3' })).toBeVisible()
    await shot(page, 'colecao-editar')

    await page.goto('./#/ficha')
    await shot(page, 'ficha')

    await page.goto('./#/sobre')
    await expect(page.getByRole('heading', { name: 'Este diário' })).toBeVisible()
    await shot(page, 'sobre')

    await page.goto('./#/design')
    await shot(page, 'design')
  })
})
