import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DiaryState } from '@/domain/schema'
import { reduce } from '@/domain/state'
import {
  clearAll,
  load,
  preserveCorrupt,
  save,
  STORAGE_KEY,
  type SaveResult,
} from '@/domain/storage'
import { DiaryContext, type DiaryContextValue, type Toast } from './DiaryContext'

let toastSeq = 0

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(load)
  const [state, setState] = useState<DiaryState | null>(
    initial.status === 'ok' ? initial.state : null,
  )
  const [saveStatus, setSaveStatus] = useState<SaveResult | 'idle'>('idle')
  const [toast, setToast] = useState<Toast | null>(null)
  const stateRef = useRef(state)
  // Original ilegível que ainda não tem cópia de segurança: bloqueia a sobrescrita.
  const unpreserved = useRef(
    initial.status === 'corrupt' && !initial.preserved ? initial.raw : null,
  )
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Salva na hora a cada mudança confirmada: nada de debounce que perde dado ao fechar.
  const commit = useCallback((next: DiaryState) => {
    stateRef.current = next
    setState(next)
    if (unpreserved.current !== null) {
      if (!preserveCorrupt(unpreserved.current)) {
        setSaveStatus('error')
        return
      }
      unpreserved.current = null
    }
    setSaveStatus(save(next))
  }, [])

  const dispatch = useCallback<DiaryContextValue['dispatch']>(
    (action, opts) => {
      const prev = stateRef.current
      if (!prev) return
      const next = reduce(prev, action)
      if (next === prev) return
      commit(next)
      if (opts?.toast) {
        setToast({ id: ++toastSeq, message: opts.toast, undo: opts.undoable ? prev : undefined })
      }
    },
    [commit],
  )

  const replace = useCallback<DiaryContextValue['replace']>(
    (next, message) => {
      commit(next)
      if (message) setToast({ id: ++toastSeq, message })
    },
    [commit],
  )

  const reset = useCallback(() => {
    clearAll()
    stateRef.current = null
    setState(null)
    setToast(null)
  }, [])

  const undo = useCallback(() => {
    if (toast?.undo) commit(toast.undo)
    setToast(null)
  }, [toast, commit])

  const dismissToast = useCallback(() => setToast(null), [])

  // Outra aba mudou os dados: recarrega em vez de sobrescrever.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      const r = load()
      const next = r.status === 'ok' ? r.state : null
      stateRef.current = next
      setState(next)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo<DiaryContextValue>(
    () => ({
      state,
      loadStatus: initial.status,
      saveStatus,
      dispatch,
      replace,
      reset,
      toast,
      dismissToast,
      undo,
    }),
    [state, initial.status, saveStatus, dispatch, replace, reset, toast, dismissToast, undo],
  )

  return <DiaryContext value={value}>{children}</DiaryContext>
}
