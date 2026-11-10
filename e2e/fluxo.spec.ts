import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const STORAGE_KEY = 'diario-berserk'

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth, 'sem rolagem horizontal').toBeLessThanOrEqual(clientWidth)
}

async function readStored(page: Page): Promise<unknown> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  return raw === null ? null : (JSON.parse(raw) as unknown)
}

/** Onboarding completo: volume 2, página 87, volumes 1 e 2 na estante. */
async function onboard(page: Page) {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Olá, Guilherme.' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.getByRole('button', { name: 'Começar' }).click()

  await expect(
    page.getByRole('heading', { name: 'Qual volume você está lendo agora?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Próximo volume' }).click()
  await page.getByLabel('Em que página parou? (opcional)').fill('87')
  await expectNoHorizontalOverflow(page)
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(
    page.getByRole('heading', { name: 'Quais volumes já estão na sua estante?' }),
  ).toBeVisible()
  // A sugestão padrão já marca do 1 até o volume atual.
  const vol1 = page.getByRole('button', { name: 'Volume 1', exact: true })
  const vol2 = page.getByRole('button', { name: 'Volume 2', exact: true })
  await expect(vol1).toHaveAttribute('aria-pressed', 'true')
  await expect(vol2).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Volume 3', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expectNoHorizontalOverflow(page)
  await page.getByRole('button', { name: 'Abrir meu diário' }).click()

  await expect(page.locator('#lendo-agora')).toHaveText('Volume 2')
  await expect(page.getByTestId('position')).toHaveText('Página 87')
}

test.describe('fluxo principal', () => {
  test('onboarding abre o diário no volume e página escolhidos', async ({ page }) => {
    await onboard(page)
    await expectNoHorizontalOverflow(page)
    const stored = (await readStored(page)) as { reader: { currentVolume: number } } | null
    expect(stored?.reader.currentVolume).toBe(2)
  })

  test('progresso: páginas e volume concluído', async ({ page }) => {
    await onboard(page)

    await page.getByRole('button', { name: 'Páginas lidas' }).click()
    const sheet = page.getByRole('dialog', { name: 'Páginas lidas' })
    await expect(sheet).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await sheet.getByRole('button', { name: '+10' }).click()
    await expect(page.getByTestId('position')).toHaveText('Página 97')

    await page.getByRole('button', { name: 'Terminei esse volume' }).click()
    await expect(page.getByText('Volume 2 concluído')).toBeVisible()
    // O toast de "+10" pode ainda estar saindo: o último é o de volume lido.
    await expect(page.getByText('Volume 2 marcado como lido')).toBeAttached()
    await expect(page.getByRole('button', { name: 'Desfazer' }).last()).toBeAttached()

    await expect(page.locator('#lendo-agora')).toHaveText('Volume 3', { timeout: 10_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('coleção: próximo a comprar, loja e marcar como tenho', async ({ page }) => {
    await onboard(page)
    await page.goto('./#/colecao')

    await expect(page.getByRole('heading', { name: 'Sua estante' })).toBeVisible()
    await expect(page.getByText('Próximo a comprar')).toBeVisible()
    await expect(page.getByTestId('next-to-buy')).toHaveText('Volume 3')
    await expectNoHorizontalOverflow(page)

    const store = page.getByRole('link', { name: /Ver na loja da Panini/ })
    await expect(store).toHaveAttribute('target', '_blank')
    await expect(store).toHaveAttribute('href', /^https:\/\/panini\.com\.br/)

    await expect(page.getByRole('button', { name: 'Volume 43: em breve' })).toBeDisabled()

    const pctBefore = await page.getByTestId('collection-pct').innerText()

    await page.getByRole('button', { name: 'Já comprei' }).click()
    const sheet = page.getByRole('dialog', { name: 'Volume 3' })
    await expect(sheet).toBeVisible()
    await sheet.getByText('Tenho', { exact: true }).click()
    await expect(sheet.getByRole('radio', { name: 'Tenho', exact: true })).toBeChecked()
    await expectNoHorizontalOverflow(page)
    await sheet.getByRole('button', { name: 'Salvar' }).click()
    await expect(sheet).toBeHidden()

    await expect(page.getByTestId('next-to-buy')).toHaveText('Volume 4')
    await expect(page.getByRole('button', { name: 'Volume 3: tenho' })).toBeVisible()
    await expect(page.getByTestId('collection-pct')).not.toHaveText(pctBefore)
    await expectNoHorizontalOverflow(page)
  })

  test('backup: exportar, limpar e importar devolve os mesmos dados', async ({
    page,
  }, testInfo) => {
    await onboard(page)
    // Gera um pouco de histórico antes do backup.
    await page.getByRole('button', { name: 'Páginas lidas' }).click()
    await page
      .getByRole('dialog', { name: 'Páginas lidas' })
      .getByRole('button', { name: '+5' })
      .click()
    await expect(page.getByTestId('position')).toHaveText('Página 92')

    await page.goto('./#/sobre')
    await expect(page.getByRole('heading', { name: 'Este diário' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    const before = await readStored(page)
    expect(before).not.toBeNull()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar backup' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^diario-berserk-\d{4}-\d{2}-\d{2}\.json$/)
    const file = testInfo.outputPath(download.suggestedFilename())
    await download.saveAs(file)
    const backup = JSON.parse(await readFile(file, 'utf8')) as { app: string; data: unknown }
    expect(backup.app).toBe('diario-berserk')
    expect(backup.data).toEqual(before)

    // Volta pra raiz antes do reload: sem dados, qualquer rota cai no onboarding.
    await page.goto('./#/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Olá, Guilherme.' })).toBeVisible()

    await page.getByTestId('import-input').setInputFiles(file)
    await expect(page.locator('#lendo-agora')).toHaveText('Volume 2')
    await expect(page.getByTestId('position')).toHaveText('Página 92')

    expect(await readStored(page)).toEqual(before)
  })

  test('backup inválido mostra erro e não mexe nos dados', async ({ page }) => {
    await onboard(page)
    await page.goto('./#/sobre')
    await expect(page.getByRole('heading', { name: 'Este diário' })).toBeVisible()
    const before = await readStored(page)

    await page.getByTestId('import-input').setInputFiles({
      name: 'qualquer.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ola: 'mundo', lista: [1, 2, 3] })),
    })
    await expect(
      page.getByRole('alert').filter({ hasText: 'Esse arquivo não é um backup do diário.' }),
    ).toBeVisible()
    expect(await readStored(page)).toEqual(before)

    await page.getByTestId('import-input').setInputFiles({
      name: 'quebrado.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ isso não é json'),
    })
    await expect(page.getByRole('alert').filter({ hasText: 'JSON quebrado' })).toBeVisible()
    expect(await readStored(page)).toEqual(before)
    await expectNoHorizontalOverflow(page)

    await page.goto('./')
    await expect(page.locator('#lendo-agora')).toHaveText('Volume 2')
  })

  test('telas principais sem rolagem horizontal', async ({ page }) => {
    await onboard(page)
    for (const route of ['jornada', 'duvidas', 'colecao', 'ficha', 'sobre', 'design']) {
      await page.goto(`./#/${route}`)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
    }
  })
})
