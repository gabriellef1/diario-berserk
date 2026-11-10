import { useState } from 'react'
import { getEdition } from '@/config'
import { StoreLink } from '@/components/StoreLink'
import { Button, Card, Eyebrow, NumberField, PageHeader, Segmented, Sheet } from '@/components/ui'
import {
  collectionPercent,
  nextToBuy,
  ownedCount,
  shelfStatus,
  type VolumeShelfStatus,
} from '@/domain/collection'
import type { CollectionStatus } from '@/domain/schema'
import { IconCheck, IconLock } from '@/icons'
import { cn } from '@/lib/cn'
import { useDiary, useDiaryState } from '@/store/DiaryContext'

const statusLabel: Record<VolumeShelfStatus, string> = {
  have: 'tenho',
  want: 'quero',
  no: 'não tenho',
  soon: 'em breve',
}

const priceFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function EditSheet({ volume, onClose }: { volume: number; onClose: () => void }) {
  const state = useDiaryState()
  const { dispatch } = useDiary()
  const item = state.collection[String(volume)]
  const [status, setStatus] = useState<CollectionStatus>(item?.status ?? 'no')
  const [price, setPrice] = useState(
    item?.price !== undefined ? String(item.price).replace('.', ',') : '',
  )
  const [boughtAt, setBoughtAt] = useState(item?.boughtAt ?? '')
  const priceNum = Number(price.replace(',', '.'))
  const priceOk = price === '' || (Number.isFinite(priceNum) && priceNum >= 0)

  function save() {
    if (!priceOk) return
    dispatch(
      {
        type: 'setCollection',
        volume,
        item: {
          status,
          ...(status === 'have' && price !== '' ? { price: Math.round(priceNum * 100) / 100 } : {}),
          ...(status === 'have' && boughtAt ? { boughtAt } : {}),
        },
      },
      { toast: `Volume ${volume}: ${statusLabel[status]}` },
    )
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={`Volume ${volume}`}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Segmented<CollectionStatus>
          legend="Na estante"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'have', label: 'Tenho' },
            { value: 'want', label: 'Quero' },
            { value: 'no', label: 'Não tenho' },
          ]}
        />
        {status === 'have' && (
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              type="text"
              inputMode="decimal"
              label="Preço pago (R$)"
              placeholder="44,90"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              error={priceOk ? undefined : 'Use só número.'}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`bought-${volume}`} className="text-sm font-semibold text-ink-2">
                Data da compra
              </label>
              <input
                id={`bought-${volume}`}
                type="date"
                value={boughtAt}
                onChange={(e) => setBoughtAt(e.target.value)}
                className="min-h-12 w-full rounded-control border border-line-strong bg-bg px-3 text-base text-ink focus-visible:border-gold"
              />
            </div>
          </div>
        )}
        <Button type="submit" variant="primary" disabled={!priceOk}>
          Salvar
        </Button>
      </form>
    </Sheet>
  )
}

export function Colecao() {
  const state = useDiaryState()
  const edition = getEdition(state.editionId)
  const [editing, setEditing] = useState<number | null>(null)
  const next = nextToBuy(state)
  const pct = collectionPercent(state)
  const have = ownedCount(state)
  const volumes = Array.from({ length: edition.totalVolumes }, (_, i) => i + 1)
  const spent = Object.values(state.collection).reduce(
    (s, i) => s + (i.status === 'have' ? (i.price ?? 0) : 0),
    0,
  )

  return (
    <>
      <PageHeader
        eyebrow="Coleção"
        title="Sua estante"
        lead={`${edition.publisher} · ${edition.name}. ${have} de ${edition.releasedUpTo} volumes lançados.`}
      />

      <section
        aria-label="Resumo da coleção"
        className="mb-4 rounded-card border border-line bg-surface p-4"
      >
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-semibold text-ink-2">Coleção completa</p>
          <p className="text-number font-bold tabular" data-testid="collection-pct">
            {pct}%
          </p>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-bg"
          role="progressbar"
          aria-label="Coleção"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        {spent > 0 && (
          <p className="mt-3 text-sm text-ink-2">Investido até agora: {priceFmt.format(spent)}</p>
        )}
      </section>

      {next !== null && (
        <Card className="riveted mb-6 border-ember/60 pt-7" aria-labelledby="proximo">
          <Eyebrow>Próximo a comprar</Eyebrow>
          <p
            id="proximo"
            className="mt-1 font-display text-[2.5rem] leading-tight font-bold"
            data-testid="next-to-buy"
          >
            Volume {next}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="primary" onClick={() => setEditing(next)}>
              <IconCheck size={20} />
              Já comprei
            </Button>
            <StoreLink />
          </div>
        </Card>
      )}

      <h2 className="mb-3 text-heading">Volumes</h2>
      <ul
        className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6"
        aria-label="Volumes da coleção"
      >
        {volumes.map((v) => {
          const s = shelfStatus(state, v)
          return (
            <li key={v}>
              <button
                type="button"
                disabled={s === 'soon'}
                onClick={() => setEditing(v)}
                aria-label={`Volume ${v}: ${statusLabel[s]}`}
                data-status={s}
                className={cn(
                  'flex min-h-20 w-full flex-col items-start justify-between rounded-card border p-3 text-left transition-colors duration-150',
                  s === 'have' && 'border-ember/70 bg-raised',
                  s === 'want' && 'border-dashed border-gold bg-surface',
                  s === 'no' && 'border-line bg-surface hover:border-line-strong',
                  s === 'soon' && 'cursor-default border-dashed border-line bg-transparent',
                  v === next && 'ring-2 ring-ember ring-offset-2 ring-offset-bg',
                )}
              >
                <span className="text-xs font-semibold text-ink-2">Volume</span>
                <span className="flex w-full items-end justify-between gap-1">
                  <span className="font-display text-[1.75rem] leading-none font-bold tabular">
                    {v}
                  </span>
                  {s === 'have' && <IconCheck size={18} className="text-ember" />}
                  {s === 'soon' && <IconLock size={16} className="text-ink-2" />}
                </span>
                <span
                  className={cn(
                    'mt-1 text-xs font-semibold',
                    s === 'have' ? 'text-ember' : s === 'want' ? 'text-gold' : 'text-ink-2',
                  )}
                >
                  {statusLabel[s]}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {editing !== null && (
        <EditSheet key={editing} volume={editing} onClose={() => setEditing(null)} />
      )}
    </>
  )
}
