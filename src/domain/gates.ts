import type { DiaryState, Doubt, Mark, Note, Written } from './schema'

/**
 * Antispoiler. Toda leitura de conteúdo escrito por ele passa por aqui.
 * Uma marca é "onde ele estava quando escreveu". Ela só aparece se não estiver
 * à frente do progresso atual. Isso vale pra telas, contadores, prompt e PNG.
 */
export type { Mark }

export function progressMark(state: DiaryState): Mark {
  return {
    volume: state.reader.currentVolume,
    position: state.reader.position,
    caughtUp: state.reader.caughtUp,
  }
}

/** true se `mark` está no ponto atual ou antes. */
export function isVisible(mark: Mark, progress: Mark): boolean {
  if (mark.volume < progress.volume) return true
  if (mark.volume > progress.volume) return false
  if (progress.caughtUp) return true
  if (mark.caughtUp) return false
  const a = mark.position
  const b = progress.position
  // Escrito num ponto marcado, mas ele não marcou onde está agora: esconde (na dúvida, protege).
  if (a && !b) return false
  // Sem posição na marca, ou em unidades diferentes: o volume decide.
  if (a?.kind !== b?.kind || !a || !b) return true
  return a.value <= b.value
}

/** A marca mais avançada entre duas (pra notas editadas várias vezes). */
export function laterMark(a: Mark, b: Mark): Mark {
  return isVisible(a, b) ? b : a
}

/** Volumes que ele já alcançou (lidos + atual). */
export function isVolumeUnlocked(volume: number, state: DiaryState): boolean {
  return volume <= state.reader.currentVolume
}

/** Filtra qualquer lista de itens marcados. */
export function visibleItems<T>(
  items: readonly T[],
  markOf: (item: T) => Mark,
  state: DiaryState,
): T[] {
  const p = progressMark(state)
  return items.filter((item) => isVisible(markOf(item), p))
}

function visibleWritten(w: Written | undefined, p: Mark): Written | undefined {
  return w && isVisible(w.mark, p) ? w : undefined
}

/**
 * Dúvidas que ele pode ver agora. A pergunta passa pelo gate da própria marca,
 * e a resposta e a resposta colada passam pelo gate delas (uma resposta escrita
 * no volume 5 pra uma dúvida do volume 2 some se ele voltar pro volume 3).
 */
export function visibleDoubts(state: DiaryState): Doubt[] {
  const p = progressMark(state)
  return state.doubts
    .filter((d) => isVisible(d.mark, p))
    .map((d) => {
      const answer = visibleWritten(d.answer, p)
      const gptAnswer = visibleWritten(d.gptAnswer, p)
      const out: Doubt = { ...d, answer, gptAnswer }
      if (!answer) {
        delete out.answer
        // Respondida num ponto que ele ainda não alcançou: pra ele, segue aberta.
        if (d.status === 'answered') out.status = 'open'
      }
      if (!gptAnswer) delete out.gptAnswer
      return out
    })
}

/** Nota de um volume, só se o volume e o ponto da escrita estiverem liberados. */
export function visibleNote(state: DiaryState, volume: number): Note | undefined {
  if (!isVolumeUnlocked(volume, state)) return undefined
  const note = state.notes[String(volume)]
  if (!note) return undefined
  return isVisible(note.mark, progressMark(state)) ? note : undefined
}

/**
 * Dúvidas que "voltaram": abertas, com lembrete num volume que ele já
 * alcançou, e que ele ainda não viu neste volume.
 */
export function returningDoubts(state: DiaryState): Doubt[] {
  const cur = state.reader.currentVolume
  return visibleDoubts(state).filter(
    (d) =>
      d.status === 'open' &&
      d.remindAt !== undefined &&
      d.remindAt <= cur &&
      (d.promptedAtVolume ?? 0) < cur,
  )
}
