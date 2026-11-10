import { volumeChaptersSchema, type VolumeChapters } from './types'

/**
 * Um arquivo por volume, carregado sob demanda. Quem chama decide se pode
 * (gate em src/domain/chapters.ts): volume à frente do progresso nunca é importado.
 */
const files = import.meta.glob<{ default: unknown }>('./vol-*.ts')

const cache = new Map<number, Promise<VolumeChapters | null>>()

export function hasVolumeFile(volume: number): boolean {
  return `./vol-${String(volume).padStart(2, '0')}.ts` in files
}

/** Carrega e valida o arquivo do volume. Sem gate: use loadReadableVolume. */
export function importVolumeChapters(volume: number): Promise<VolumeChapters | null> {
  const key = `./vol-${String(volume).padStart(2, '0')}.ts`
  const loader = files[key]
  if (!loader) return Promise.resolve(null)
  let p = cache.get(volume)
  if (!p) {
    p = loader().then((m) => {
      const parsed = volumeChaptersSchema.safeParse(m.default)
      return parsed.success && parsed.data.volume === volume ? parsed.data : null
    })
    cache.set(volume, p)
  }
  return p
}

/** Só pra testes: limpa o cache entre casos. */
export function clearChapterCache() {
  cache.clear()
}
