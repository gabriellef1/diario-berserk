import { useState } from 'react'
import { config, getEdition } from '@/config'
import { ExportBackupButton, ImportBackupButton } from '@/components/BackupControls'
import { Button, Card, PageHeader, Sheet } from '@/components/ui'
import { useDiary, useDiaryState } from '@/store/DiaryContext'

export function Sobre() {
  const state = useDiaryState()
  const { reset } = useDiary()
  const edition = getEdition(state.editionId)
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <>
      <PageHeader eyebrow="Sobre" title="Este diário" />

      <div className="flex flex-col gap-4">
        <Card aria-labelledby="backup-title">
          <h2 id="backup-title" className="text-heading">
            Backup
          </h2>
          <p className="mt-2 text-ink-2">
            Tudo fica só neste aparelho. Antes de trocar de celular, baixe o backup e restaure no
            novo. O arquivo é completo: inclui também o que ainda está escondido por volume.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <ExportBackupButton />
            <ImportBackupButton confirmReplace />
          </div>
        </Card>

        <Card aria-labelledby="regra-title">
          <h2 id="regra-title" className="text-heading">
            A regra da casa
          </h2>
          <p className="mt-2 text-ink-2">
            Nada aqui fala da história. Tudo que você escrever fica preso ao volume em que escreveu
            e só aparece quando você chegar lá. Volumes à frente aparecem só pelo número.
          </p>
        </Card>

        <Card aria-labelledby="edicao-title">
          <h2 id="edicao-title" className="text-heading">
            Edição
          </h2>
          <p className="mt-2 text-ink-2">
            {edition.publisher} · {edition.name}. {edition.totalVolumes} volumes,{' '}
            {edition.releasedUpTo} já lançados.
          </p>
        </Card>

        {config.giftMessage.trim() !== '' && (
          <Card className="riveted pt-8" aria-labelledby="gabs-title">
            <h2 id="gabs-title" className="text-heading text-ember">
              Um recado
            </h2>
            <p className="mt-2 whitespace-pre-line">{config.giftMessage}</p>
          </Card>
        )}

        <div className="mt-2 flex justify-center">
          <Button variant="ghost" onClick={() => setConfirmReset(true)}>
            Apagar tudo deste aparelho
          </Button>
        </div>

        <p className="mt-4 text-center font-display text-xl text-ink-2">{config.signature}</p>
      </div>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Apagar tudo?">
        <p className="text-ink-2">
          Isso apaga o progresso, a coleção e tudo que você escreveu neste aparelho. Só dá pra
          recuperar com um backup.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button onClick={() => setConfirmReset(false)}>Cancelar</Button>
          <Button variant="primary" onClick={reset}>
            Apagar
          </Button>
        </div>
      </Sheet>
    </>
  )
}
