import { expect, test, type Page } from '@playwright/test'
import vol02 from '../src/data/chapters/vol-02'
import vol03 from '../src/data/chapters/vol-03'
import { collectConsoleErrors, openWith, seedState } from './seed'

const snippet = (s: string) => s.slice(0, 40)

async function bodyText(page: Page) {
  return page.evaluate(() => ({
    text: document.body.textContent ?? '',
    html: document.body.innerHTML,
  }))
}

test('capítulos: liberar, resumo, da última vez, esconder, desmarcar, nada do vol. 3', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page)
  await openWith(page, seedState(), './#/volume/2')

  // Nada lido: só números e cadeados, nenhum resumo no DOM.
  const items = page.getByTestId('chapter')
  await expect(items).toHaveCount(vol02.chapters.length)
  await expect(items.first()).toHaveAttribute('data-read', 'false')
  await expect(page.getByTestId('chapter-summary')).toHaveCount(0)
  let body = await bodyText(page)
  for (const c of vol02.chapters) expect(body.html).not.toContain(snippet(c.summary))

  // Marca o primeiro: o resumo dele aparece ao expandir; o segundo segue fora do DOM.
  await items.first().getByRole('button', { name: 'Li esse capítulo' }).click()
  await expect(items.first()).toHaveAttribute('data-read', 'true')
  await page.getByRole('button', { name: /Ver resumo/ }).click()
  await expect(page.getByTestId('chapter-summary')).toContainText(
    snippet(vol02.chapters[0]?.summary ?? ''),
  )
  body = await bodyText(page)
  expect(body.html).not.toContain(snippet(vol02.chapters[1]?.summary ?? ''))

  // Hoje: card "da última vez" com o capítulo recém-lido.
  await page.goto('./#/')
  const last = page.getByTestId('last-time')
  await expect(last).toContainText(snippet(vol02.chapters[0]?.summary ?? ''))
  await expect(last).toContainText('Volume 2')

  // Volume 3: rota volta pra Jornada e nenhum texto dele existe no DOM.
  await page.goto('./#/volume/3')
  await expect(page.getByRole('heading', { name: 'A estrada até aqui' })).toBeVisible()
  await expect(page.getByTestId('chapter')).toHaveCount(0)
  body = await bodyText(page)
  for (const c of vol03.chapters) {
    expect(body.html).not.toContain(snippet(c.summary))
    expect(body.text).not.toContain(c.title)
  }

  // Esconder resumos: some o botão de ver e o card da Hoje.
  await page.goto('./#/sobre')
  await page.getByTestId('toggle-summaries').check({ force: true })
  await page.goto('./#/volume/2')
  await expect(items.first()).toHaveAttribute('data-read', 'true')
  await expect(page.getByRole('button', { name: /Ver resumo/ })).toHaveCount(0)
  await page.goto('./#/')
  await expect(page.getByTestId('last-time')).toHaveCount(0)
  await page.goto('./#/sobre')
  await page.getByTestId('toggle-summaries').uncheck({ force: true })

  // Desmarcar esconde de novo.
  await page.goto('./#/volume/2')
  await items.first().getByRole('button', { name: 'Não li ainda' }).click()
  await expect(items.first()).toHaveAttribute('data-read', 'false')
  await expect(page.getByTestId('chapter-summary')).toHaveCount(0)

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  expect(errors).toEqual([])
})

test('resumo editado tem prioridade e volta ao padrão', async ({ page }) => {
  await openWith(page, seedState({ chaptersRead: { '2': 1 } }), './#/volume/2')
  await page.getByRole('button', { name: /Ver resumo/ }).click()
  await page.getByRole('button', { name: 'Escrever minha versão' }).click()
  await page.getByLabel('Sua versão do resumo').fill('Minha versão do capítulo, do meu jeito.')
  await page.getByTestId('chapter-summary').getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByTestId('chapter-summary')).toContainText('Minha versão do capítulo')
  await expect(page.getByTestId('chapter-summary')).not.toContainText(
    snippet(vol02.chapters[0]?.summary ?? ''),
  )
  await page.getByRole('button', { name: 'Voltar ao padrão' }).click()
  await expect(page.getByTestId('chapter-summary')).toContainText(
    snippet(vol02.chapters[0]?.summary ?? ''),
  )
})
