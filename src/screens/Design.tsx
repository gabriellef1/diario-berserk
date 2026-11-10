import { useState } from 'react'
import { Button, Card, Eyebrow, NumberField, PageHeader, Segmented, Stat } from '@/components/ui'
import {
  AppMark,
  IconBook,
  IconCandle,
  IconCheck,
  IconChevron,
  IconClose,
  IconDownload,
  IconEmber,
  IconExternal,
  IconLock,
  IconPlus,
  IconQuill,
  IconRoad,
  IconShelf,
  IconUndo,
  IconUpload,
  Milestone,
} from '@/icons'
import { contrast, tokens } from '@/lib/contrast'

/** Página interna: o design system documentado. Sem link na navegação. */
const textPairs: { fg: keyof typeof tokens; bg: keyof typeof tokens; use: string }[] = [
  { fg: 'ink', bg: 'bg', use: 'texto principal' },
  { fg: 'ink', bg: 'raised', use: 'texto em card elevado' },
  { fg: 'ink-2', bg: 'bg', use: 'texto secundário' },
  { fg: 'ink-2', bg: 'raised', use: 'secundário em elevado' },
  { fg: 'ink', bg: 'blood', use: 'botão principal' },
  { fg: 'ink', bg: 'blood-hover', use: 'botão principal (hover)' },
  { fg: 'blood-text', bg: 'bg', use: 'erro / vermelho legível' },
  { fg: 'ember', bg: 'bg', use: 'brasa (destaque)' },
  { fg: 'ember', bg: 'raised', use: 'brasa em elevado' },
  { fg: 'gold', bg: 'bg', use: 'ouro / foco' },
  { fg: 'line-strong', bg: 'surface', use: 'borda funcional (3:1)' },
]

const icons = {
  IconCandle,
  IconRoad,
  IconShelf,
  IconQuill,
  IconBook,
  IconEmber,
  IconLock,
  IconPlus,
  IconCheck,
  IconClose,
  IconChevron,
  IconUndo,
  IconDownload,
  IconUpload,
  IconExternal,
}

export function Design() {
  const [seg, setSeg] = useState<'have' | 'want' | 'no'>('have')
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Interno"
        title="Design system"
        lead="Feito a quatro mãos (Claude + Codex). Paleta, contraste e escala vieram do Codex; tipografia pesada, rebites nos marcos e celebração de 600ms foram ajustes do Claude."
      />

      <h2 className="mb-3 text-heading">Cores</h2>
      <ul className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(tokens).map(([name, hex]) => (
          <li key={name} className="rounded-card border border-line bg-surface p-2">
            <span
              className="block h-12 rounded-control border border-line"
              style={{ background: hex }}
            />
            <span className="mt-2 block text-sm font-semibold">{name}</span>
            <span className="block font-mono text-xs text-ink-2">{hex}</span>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-heading">Contraste medido</h2>
      <div className="mb-8 overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-raised text-ink-2">
            <tr>
              <th className="p-3">Uso</th>
              <th className="p-3">Amostra</th>
              <th className="p-3 text-right">Razão</th>
            </tr>
          </thead>
          <tbody>
            {textPairs.map((p) => {
              const r = contrast(tokens[p.fg], tokens[p.bg])
              return (
                <tr key={p.use} className="border-t border-line">
                  <td className="p-3">{p.use}</td>
                  <td className="p-3">
                    <span
                      className="rounded-control px-2 py-1 font-semibold"
                      style={{ color: tokens[p.fg], background: tokens[p.bg] }}
                    >
                      {p.fg} / {p.bg}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold tabular">
                    {r.toFixed(2).replace('.', ',')}:1
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-heading">Tipografia</h2>
      <Card className="mb-8 flex flex-col gap-3">
        <p className="font-display text-[3.25rem] leading-none font-bold">Volume 3</p>
        <p className="font-display text-title font-bold">Título · Grenze Gotisch 700 · 36/42</p>
        <p className="font-display text-heading font-bold">Seção · Grenze Gotisch 700 · 28/34</p>
        <p>Corpo · Archivo 500 · 16/24. Texto curto, com respiro entre blocos.</p>
        <p className="text-sm text-ink-2">Auxiliar · Archivo 500 · 14/20</p>
        <p className="font-semibold">Botão e label · Archivo 600</p>
        <p className="text-number font-bold tabular">1234 · números Archivo 700 tabulares</p>
        <Eyebrow>Sobretítulo · 600 · caixa alta</Eyebrow>
      </Card>

      <h2 className="mb-3 text-heading">Espaço, raio e motion</h2>
      <Card className="mb-8">
        <ul className="flex flex-wrap items-end gap-3">
          {[4, 8, 12, 16, 24, 32, 48, 64].map((n) => (
            <li key={n} className="flex flex-col items-center gap-1">
              <span className="block bg-ember" style={{ width: n, height: n }} />
              <span className="text-xs text-ink-2 tabular">{n}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-2">
          Raios: controle 4px, card 6px, diálogo 8px. Motion: pressionar 100ms, estados 160ms,
          diálogo 220ms, celebração de volume 600ms. Entrada cubic-bezier(.2,.8,.2,1), saída
          (.4,0,1,1). Deslocamento máximo 8px, sem loop. Com reduced-motion: só opacidade.
        </p>
      </Card>

      <h2 className="mb-3 text-heading">Componentes</h2>
      <Card className="mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Principal</Button>
          <Button>Secundário</Button>
          <Button variant="ghost">Discreto</Button>
          <Button variant="primary" disabled>
            Desabilitado
          </Button>
        </div>
        <Segmented
          legend="Seletor de 3 opções"
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'have', label: 'Tenho' },
            { value: 'want', label: 'Quero' },
            { value: 'no', label: 'Não tenho' },
          ]}
        />
        <NumberField
          label="Campo numérico"
          hint="Label sempre visível, dica embaixo."
          placeholder="87"
        />
        <NumberField
          label="Campo com erro"
          error="Mensagem de erro em texto, não só cor."
          defaultValue={-1}
        />
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Lidos" value={2} />
          <Stat label="Dias seguidos" value={5} />
          <Stat label="Pág./dia" value={18} />
        </div>
        <div className="riveted rounded-card border border-line-strong bg-raised px-4 pt-7 pb-4">
          Card com rebites (só marcos, ficha e destaques)
        </div>
      </Card>

      <h2 className="mb-3 text-heading">Marcos e ícones (SVG original)</h2>
      <Card className="flex flex-col gap-6">
        <div className="flex items-end gap-6">
          <AppMark size={56} />
          <Milestone state="done" size={56} />
          <Milestone state="current" size={56} />
          <Milestone state="locked" size={56} />
        </div>
        <ul className="grid grid-cols-5 gap-4 sm:grid-cols-8">
          {Object.entries(icons).map(([name, Icon]) => (
            <li key={name} className="flex flex-col items-center gap-1 text-ink">
              <Icon />
              <span className="text-[10px] text-ink-2">{name.replace('Icon', '')}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
