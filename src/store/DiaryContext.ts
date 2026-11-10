import { createContext, use } from 'react'
import type { DiaryState } from '@/domain/schema'
import type { Action } from '@/domain/state'
import type { LoadResult, SaveResult } from '@/domain/storage'

export interface Toast {
  id: number
  message: string
  undo?: DiaryState
}

export interface DiaryContextValue {
  state: DiaryState | null
  loadStatus: LoadResult['status']
  saveStatus: SaveResult | 'idle'
  dispatch: (action: Action, opts?: { toast?: string; undoable?: boolean }) => void
  replace: (state: DiaryState, toast?: string) => void
  reset: () => void
  toast: Toast | null
  dismissToast: () => void
  undo: () => void
}

export const DiaryContext = createContext<DiaryContextValue | null>(null)

export function useDiary() {
  const ctx = use(DiaryContext)
  if (!ctx) throw new Error('useDiary fora do DiaryProvider')
  return ctx
}

/** Para telas que só existem depois do onboarding. */
export function useDiaryState(): DiaryState {
  const { state } = useDiary()
  if (!state) throw new Error('Estado ausente: onboarding não concluído')
  return state
}
