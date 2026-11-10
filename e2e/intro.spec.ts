import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { collectConsoleErrors, openWith, seedState } from './seed'

const dir = process.env.SCREENSHOT_DIR
if (dir) mkdirSync(path.join(dir, 'video'), { recursive: true })

test.use({ video: dir ? 'on' : 'off' })

const intro = (page: Page) => page.getByTestId('intro')

async function frame(page: Page, name: string) {
  if (!dir) return
  await page.screenshot({
    path: path.join(dir, `${test.info().project.name}-intro-${name}.png`),
  })
}

test('entrada completa roda até a Hoje, uma vez por dia', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  // Grava cada fase no próprio navegador (polling perde fases de 200ms sob carga).
  await page.addInitScript(() => {
    const w = window as unknown as { __phases: string[] }
    w.__phases = []
    new MutationObserver(() => {
      const p = document.querySelector('[data-testid="intro"]')?.getAttribute('data-phase')
      if (p && w.__phases[w.__phases.length - 1] !== p) w.__phases.push(p)
    }).observe(document, { subtree: true, attributes: true, childList: true })
  })
  await openWith(
    page,
    seedState({ settings: { hideSummaries: false, intro: 'auto', atmosphere: true } }),
  )

  await expect(intro(page)).toBeVisible()
  await frame(page, '0-ember')
  for (const [phase, name] of [
    ['oi', '1-oi'],
    ['name', '2-name'],
    ['cool', '3-cool'],
  ] as const) {
    await page
      .waitForFunction(
        (p) => (window as unknown as { __phases: string[] }).__phases.includes(p),
        phase,
        { timeout: 6000 },
      )
      .catch(() => undefined)
    await frame(page, name)
  }
  await expect(page.getByTestId('intro-line')).toHaveText('volume 2 te esperando')
  await expect(intro(page)).toHaveCount(0, { timeout: 6000 })
  const phases = await page.evaluate(() => (window as unknown as { __phases: string[] }).__phases)
  expect(phases).toEqual(['ember', 'oi', 'name', 'cool', 'exit'])
  await expect(page.locator('#lendo-agora')).toHaveText('Volume 2')
  await frame(page, '5-hoje')

  // Fundo animado ligado e rodando: mede o FPS do rAF por 2s e lê o do canvas.
  const fps = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let frames = 0
        const start = performance.now()
        function tick() {
          frames++
          if (performance.now() - start < 2000) requestAnimationFrame(tick)
          else resolve(Math.round(frames / 2))
        }
        requestAnimationFrame(tick)
      }),
  )
  const canvas = page.locator('[data-testid="atmosphere"] canvas')
  await expect(canvas).toHaveCount(1)
  const canvasFps = await canvas.getAttribute('data-fps')
  const particles = await canvas.getAttribute('data-particles')
  console.log(
    `[${test.info().project.name}] fps rAF=${fps} canvas=${canvasFps ?? '?'} partículas=${particles ?? '?'}`,
  )
  // Sem asserção de número: CI e headless rodam sem GPU. O FPS real vai no relatório.
  expect(fps).toBeGreaterThan(0)

  // Segunda abertura no mesmo dia: versão curta, já fria.
  await page.reload()
  await expect(intro(page)).toBeVisible()
  await expect(intro(page)).toHaveAttribute('data-phase', /cool|exit/)
  await expect(intro(page)).toHaveCount(0, { timeout: 5000 })
  expect(errors).toEqual([])

  if (dir) {
    const video = page.video()
    await page.context().close()
    await video?.saveAs(path.join(dir, 'video', `${test.info().project.name}-entrada.webm`))
  }
})

test('pular: botão, toque e tecla', async ({ page }) => {
  const seed = seedState({ settings: { hideSummaries: false, intro: 'auto', atmosphere: true } })

  await openWith(page, seed)
  await expect(intro(page)).toBeVisible()
  await page.getByTestId('intro-skip').click()
  await expect(intro(page)).toHaveCount(0, { timeout: 500 })
  await expect(page.locator('#lendo-agora')).toBeVisible()

  // "sempre curta" pra reabrir com entrada mesmo depois da completa do dia.
  await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key) ?? '{}') as { settings: { intro: string } }
    s.settings.intro = 'short'
    localStorage.setItem(key, JSON.stringify(s))
  }, 'diario-berserk')

  await page.reload()
  await expect(intro(page)).toBeVisible()
  await page.mouse.click(40, 120)
  await expect(intro(page)).toHaveCount(0, { timeout: 500 })

  await page.reload()
  await expect(intro(page)).toBeVisible()
  await page.keyboard.press('Space')
  await expect(intro(page)).toHaveCount(0, { timeout: 500 })
})

test('entrada desligada não aparece; celebração após terminar volume', async ({ page }) => {
  await openWith(page, seedState())
  await expect(page.locator('#lendo-agora')).toBeVisible()
  await expect(intro(page)).toHaveCount(0)

  await openWith(
    page,
    seedState({
      settings: { hideSummaries: false, intro: 'short', atmosphere: true },
      intro: { celebrateVolume: 2 },
    }),
  )
  await expect(page.getByTestId('intro-line')).toHaveText('volume 2 concluído')
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  test('entrada simples e fundo estático', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await openWith(
      page,
      seedState({ settings: { hideSummaries: false, intro: 'auto', atmosphere: true } }),
    )
    await expect(intro(page)).toBeVisible()
    await expect(intro(page)).toHaveAttribute('data-phase', 'cool')
    await expect(page.locator('.forge-strike')).toHaveCount(0)
    await frame(page, 'reduced')
    await expect(intro(page)).toHaveCount(0, { timeout: 6000 })
    const atm = page.getByTestId('atmosphere')
    await expect(atm).toHaveAttribute('data-animated', 'false')
    await expect(atm.locator('canvas')).toHaveCount(0)
    expect(errors).toEqual([])
  })
})
