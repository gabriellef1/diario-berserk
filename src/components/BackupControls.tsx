import { useRef, useState } from 'react'
import { nowIso } from '@/domain/dates'
import { backupFileName, parseBackup, toBackup } from '@/domain/storage'
import { IconDownload, IconUpload } from '@/icons'
import { useDiary } from '@/store/DiaryContext'
import { Button } from './ui'

function backupBlob(text: string) {
  return new Blob([text], { type: 'application/json' })
}

export function ExportBackupButton() {
  const { state } = useDiary()
  if (!state) return null
  const current = state
  const canShareFiles =
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] })

  function payload() {
    const at = nowIso()
    return { name: backupFileName(at), text: JSON.stringify(toBackup(current, at), null, 2) }
  }

  function download() {
    const { name, text } = payload()
    const url = URL.createObjectURL(backupBlob(text))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function share() {
    const { name, text } = payload()
    const file = new File([text], name, { type: 'application/json' })
    try {
      await navigator.share({ files: [file], title: 'Backup do diário' })
    } catch {
      // Cancelou o compartilhamento: nada a fazer.
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button variant="primary" onClick={download}>
        <IconDownload size={20} />
        Baixar backup
      </Button>
      {canShareFiles && <Button onClick={() => void share()}>Enviar backup pra outro app</Button>}
    </div>
  )
}

/** Importa backup. Se o arquivo for inválido, os dados atuais não mudam. */
export function ImportBackupButton({
  label = 'Restaurar backup',
  confirmReplace,
  onDone,
}: {
  label?: string
  /** Pergunta antes de substituir dados existentes. */
  confirmReplace?: boolean
  onDone?: () => void
}) {
  const { replace } = useDiary()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file: File) {
    setError(null)
    const result = parseBackup(await file.text())
    if (!result.ok) {
      setError(result.message)
      return
    }
    if (
      confirmReplace &&
      !window.confirm('Restaurar este backup vai substituir o que está neste aparelho. Continuar?')
    ) {
      return
    }
    replace(result.state, 'Backup restaurado')
    onDone?.()
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="import-input"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void onFile(f)
        }}
      />
      <Button onClick={() => input.current?.click()}>
        <IconUpload size={20} />
        {label}
      </Button>
      {error && (
        <p role="alert" className="text-sm font-semibold text-blood-text">
          {error}
        </p>
      )}
    </div>
  )
}
