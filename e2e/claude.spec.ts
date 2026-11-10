import { expect, test } from '@playwright/test'
import { openWith, seedState } from './seed'

// A função real gasta crédito: aqui ela é simulada. O teste no ar é manual.
test('perguntar ao Claude: senha, resposta e guardar na dúvida', async ({ page }) => {
  const sent: unknown[] = []
  await page.route('https://diario-berserk-api.vercel.app/api/ask', async (route) => {
    const req = route.request()
    sent.push({ body: req.postDataJSON() as unknown, senha: req.headers()['x-diario-senha'] })
    await route.fulfill({
      status: req.headers()['x-diario-senha'] === 'certa' ? 200 : 401,
      contentType: 'application/json',
      body: JSON.stringify(
        req.headers()['x-diario-senha'] === 'certa'
          ? { answer: 'Isso ainda vai ser mostrado. Fica mais claro no volume 3.' }
          : { error: 'senha' },
      ),
    })
  })
  await openWith(
    page,
    seedState({
      doubts: [
        {
          id: 'd1',
          text: 'o que é aquilo que fica aparecendo?',
          askedAt: '2026-11-01T15:00:00.000Z',
          mark: { volume: 2, position: { kind: 'page', value: 80 } },
          status: 'open',
        },
      ],
    }),
    './#/duvidas',
  )
  const item = page.getByTestId('doubt-item').first()
  await item.getByRole('button', { name: 'Perguntar sem spoiler' }).click()

  // Senha errada: avisa e pede de novo.
  await page.getByLabel('Senha do diário').fill('errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toContainText('Senha errada')

  // Senha certa: resposta aparece e dá pra guardar.
  await page.getByLabel('Senha do diário').fill('certa')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByTestId('claude-answer')).toContainText('Fica mais claro no volume 3')
  await page.getByRole('button', { name: 'Guardar essa resposta' }).click()
  await page.keyboard.press('Escape')
  await expect(item).toContainText('Resposta do Claude que você guardou')
  await expect(item).toContainText('Fica mais claro no volume 3')

  // Só a pergunta e o ponto de leitura foram enviados.
  expect(sent.at(-1)).toEqual({
    body: {
      question: 'o que é aquilo que fica aparecendo?',
      volume: 2,
      position: { kind: 'page', value: 87 },
      caughtUp: false,
    },
    senha: 'certa',
  })
  // A senha fica no aparelho, fora do diário (e do backup).
  const diario = await page.evaluate(() => localStorage.getItem('diario-berserk') ?? '')
  expect(diario).not.toContain('certa"')
})
