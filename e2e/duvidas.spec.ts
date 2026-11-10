import { expect, test } from '@playwright/test'

const STORAGE_KEY = 'diario-berserk'
const at = '2026-11-01T15:00:00.000Z'

/** Estado v2 pronto: volume 2, página 87, volumes 1 e 2 na estante. */
const seed = {
  schemaVersion: 3,
  editionId: 'panini-luxo',
  createdAt: at,
  reader: {
    currentVolume: 2,
    position: { kind: 'page', value: 87 },
    trackBy: 'page',
    caughtUp: false,
  },
  volumes: { '2': { startedAt: at } },
  collection: { '1': { status: 'have' }, '2': { status: 'have' } },
  readingLog: {},
  doubts: [],
  notes: {},
  achievementsSeen: [
    'primeiro-marco',
    'cinco-marcos',
    'primeira-duvida',
    'duvida-resolvida',
    'sete-dias',
    'trinta-dias',
    'estante-5',
    'estante-20',
  ],
  chaptersRead: {},
  chapterEdits: {},
  settings: { hideSummaries: false, intro: 'off', atmosphere: true },
  intro: {},
}

test('dúvida que volta + ponte com o ChatGPT', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const consoleErrors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  page.on('pageerror', (e) => consoleErrors.push(e.message))
  await page.goto('./')
  await page.evaluate(({ k, v }) => localStorage.setItem(k, v), {
    k: STORAGE_KEY,
    v: JSON.stringify(seed),
  })
  await page.goto('./#/duvidas')
  await page.reload()

  const question = 'o que é aquilo que fica aparecendo?'
  await page.getByLabel('Sua dúvida').fill(question)
  await page.getByLabel('Lembrar quando eu chegar no volume').selectOption('3')
  await page.getByRole('button', { name: 'Guardar dúvida' }).click()

  const item = page.getByTestId('doubt-item').filter({ hasText: question })
  await expect(item).toBeVisible()

  // Ponte: o prompt leva o volume e a página atuais, e é isso que vai pro clipboard.
  await item.getByRole('button', { name: 'Perguntar sem spoiler' }).click()
  const prompt = page.getByTestId('prompt-text')
  await expect(prompt).toContainText('Li até o volume 2, página 87')
  await expect(prompt).toContainText(`Minha pergunta: ${question}`)
  await page.getByTestId('copy-prompt').click()
  await expect(page.getByTestId('copy-prompt')).toHaveText(/Copiado/)
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe(await prompt.innerText())
  const open = page.getByTestId('open-chatgpt')
  await expect(open).toHaveAttribute('href', /^https:\/\/chatgpt\.com/)
  await expect(open).toHaveAttribute('target', '_blank')

  await page.getByTestId('gpt-answer-input').fill('resposta colada de teste')
  await page.getByRole('button', { name: 'Guardar resposta' }).click()
  await page.keyboard.press('Escape')
  await expect(item).toContainText('resposta colada de teste')

  // No volume 2 ainda não voltou; ao terminar o volume 2, ela aparece em destaque.
  await page.goto('./#/')
  await expect(page.getByTestId('returning-doubt')).toHaveCount(0)
  await page.getByRole('button', { name: 'Terminei esse volume' }).click()
  await page.getByText('Volume 2 concluído').click()
  const back = page.getByTestId('returning-doubt')
  await expect(back).toBeVisible()
  await expect(back).toContainText('Você chegou no volume 3')
  await expect(back).toContainText(question)

  await back.getByRole('button', { name: 'Ainda não' }).click()
  await expect(page.getByTestId('returning-doubt')).toHaveCount(0)

  // Passa pelas outras telas e confere que nada estourou no console.
  for (const route of ['./#/jornada', './#/colecao', './#/ficha', './#/sobre']) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
  }
  expect(consoleErrors).toEqual([])
})
