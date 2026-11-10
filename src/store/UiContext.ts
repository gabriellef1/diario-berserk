import { createContext, use } from 'react'

/**
 * Estado de interface que não vai pro diário.
 * - introActive: a entrada está na tela.
 * - nameHandoff: a entrada está saindo e o nome deve voar pro cabeçalho.
 */
export const UiContext = createContext<{ introActive: boolean; nameHandoff: boolean }>({
  introActive: false,
  nameHandoff: false,
})

export function useUi() {
  return use(UiContext)
}
