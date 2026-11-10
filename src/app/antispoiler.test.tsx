import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { save } from '@/domain/storage'
import { at, makeState, run } from '@/test/domain'
import { App } from './App'

/**
 * Critério de pronto: conteúdo escrito num ponto à frente do progresso atual
 * nunca renderiza, em nenhuma tela. Tudo que tem "SEGREDO" foi escrito no
 * volume 5; ele volta pro volume 3 e o app é aberto do zero em cada rota.
 */
function seed() {
  const s = run(
    makeState({ currentVolume: 2, position: { kind: 'page', value: 50 }, owned: [1, 2] }),
    { type: 'addDoubt', id: 'v2', text: 'pergunta-visivel-v2', remindAt: 3, at: at(2026, 11, 1) },
    { type: 'jumpTo', volume: 5, position: { kind: 'page', value: 20 }, at: at(2026, 11, 2) },
    { type: 'addDoubt', id: 'v5', text: 'SEGREDO-DUVIDA-V5', at: at(2026, 11, 2) },
    { type: 'answerDoubt', id: 'v2', text: 'SEGREDO-RESPOSTA-V5', at: at(2026, 11, 2) },
    { type: 'saveGptAnswer', id: 'v2', text: 'SEGREDO-GPT-V5', at: at(2026, 11, 2) },
    { type: 'saveNote', volume: 5, rating: 5, text: 'SEGREDO-NOTA-V5', at: at(2026, 11, 2) },
    { type: 'saveNote', volume: 3, text: 'SEGREDO-NOTA-V3-ESCRITA-NO-V5', at: at(2026, 11, 2) },
    { type: 'jumpTo', volume: 3, position: { kind: 'page', value: 10 }, at: at(2026, 11, 3) },
    { type: 'markChapter', volume: 3, index: 0, n: 6 },
  )
  expect(save(s)).toBe('saved')
}

const routes = ['/', '/jornada', '/duvidas', '/colecao', '/ficha', '/sobre']

describe('antispoiler na interface', () => {
  it.each(routes)('nada escrito à frente aparece em %s', (route) => {
    seed()
    window.location.hash = `#${route}`
    const { container, unmount } = render(<App />)
    expect(container.ownerDocument.body.textContent).not.toMatch(/SEGREDO/)
    unmount()
  })

  it('a dúvida do volume 2 continua visível e aberta (controle positivo)', async () => {
    seed()
    window.location.hash = '#/duvidas'
    render(<App />)
    expect(await screen.findAllByText(/pergunta-visivel-v2/)).not.toHaveLength(0)
  })

  it('volumes futuros na jornada não têm página pra abrir', () => {
    seed()
    window.location.hash = '#/jornada'
    render(<App />)
    expect(screen.queryByRole('link', { name: /Volume 4/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Volume 3/ })).toBeInTheDocument()
  })

  it('a rota de um volume futuro volta pra jornada sem carregar capítulo', async () => {
    seed()
    window.location.hash = '#/volume/4'
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'A estrada até aqui' })).toBeInTheDocument()
    expect(screen.queryByTestId('chapter')).toBeNull()
  })

  it('no volume atual só o capítulo marcado tem resumo; o resto não entra no DOM', async () => {
    seed()
    window.location.hash = '#/volume/3'
    render(<App />)
    const items = await screen.findAllByTestId('chapter')
    const data = (await import('@/data/chapters/vol-03')).default
    expect(items).toHaveLength(data.chapters.length)
    expect(items[0]).toHaveAttribute('data-read', 'true')
    expect(items[1]).toHaveAttribute('data-read', 'false')
    await userEvent.click(screen.getByRole('button', { name: /Ver resumo/ }))
    const body = document.body.textContent ?? ''
    expect(body).toContain(data.chapters[0]?.summary.slice(0, 40))
    for (const c of data.chapters.slice(1)) {
      expect(body).not.toContain(c.summary.slice(0, 40))
    }
    expect(document.body.innerHTML).not.toContain(data.chapters[1]?.summary.slice(0, 40) ?? '')
  })

  it('detalhe do volume atual não mostra nota escrita mais à frente', async () => {
    seed()
    window.location.hash = '#/jornada'
    render(<App />)
    await userEvent.click(screen.getByRole('link', { name: /Volume 3/ }))
    expect(await screen.findByTestId('note-hidden')).toBeInTheDocument()
    const fields = [
      ...document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>('textarea, input'),
    ]
    expect(document.body.textContent + fields.map((f) => f.value).join(' ')).not.toMatch(/SEGREDO/)
  })
})
