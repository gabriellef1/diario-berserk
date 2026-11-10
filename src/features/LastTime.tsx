import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Card, Eyebrow } from '@/components/ui'
import { lastReadChapter, type LastRead } from '@/domain/chapters'
import { useDiaryState } from '@/store/DiaryContext'
import { useUi } from '@/store/UiContext'

/** "Da última vez": o resumo do último capítulo lido, pra relembrar antes de voltar. */
export function LastTime() {
  const state = useDiaryState()
  const { introActive } = useUi()
  const [last, setLast] = useState<LastRead | null>(null)
  const key = `${state.reader.currentVolume}:${state.reader.caughtUp}:${JSON.stringify(state.chaptersRead)}:${JSON.stringify(state.reader.position)}:${state.settings.hideSummaries}:${Object.keys(state.chapterEdits).length}`

  useEffect(() => {
    // Espera a entrada acabar: nada de disputar a thread com a animação.
    if (introActive) return
    let alive = true
    void lastReadChapter(state).then((r) => {
      if (alive) setLast(r)
    })
    return () => {
      alive = false
    }
    // `key` resume o que muda o resultado.
  }, [key, introActive]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!last) return null
  const { volume, view } = last
  return (
    <Card className="mb-4" data-testid="last-time">
      <Eyebrow>Da última vez</Eyebrow>
      <p className="mt-1 font-semibold">
        Volume {volume} · {view.title ?? `Capítulo ${view.number}`}
      </p>
      <p className="mt-2 leading-relaxed text-ink-2">{view.summary}</p>
      <Link
        to={`/volume/${volume}`}
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-ember underline underline-offset-4"
      >
        Abrir o registro do volume {volume}
      </Link>
    </Card>
  )
}
