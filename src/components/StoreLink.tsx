import { getEdition } from '@/config'
import { IconExternal } from '@/icons'
import { useDiaryState } from '@/store/DiaryContext'

/** Link pra loja oficial da edição. Só loja oficial, em nova aba. */
export function StoreLink() {
  const state = useDiaryState()
  const edition = getEdition(state.editionId)
  if (!edition.storeUrl) return null
  return (
    <a
      href={edition.storeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
    >
      Ver na {edition.storeName}
      <IconExternal size={16} />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  )
}
