import { createState, reduce, type Action, type OnboardingInput } from '@/domain/state'
import type { DiaryState } from '@/domain/schema'

/** ISO a partir de horário LOCAL (meio-dia por padrão), pra não escorregar de dia no fuso. */
export function at(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month - 1, day, hour).toISOString()
}

export const T0 = at(2026, 11, 10)

export function makeState(input: Partial<OnboardingInput> = {}): DiaryState {
  return createState({
    editionId: 'panini-luxo',
    currentVolume: 1,
    position: null,
    owned: [],
    at: T0,
    ...input,
  })
}

export function run(state: DiaryState, ...actions: Action[]): DiaryState {
  return actions.reduce(reduce, state)
}
