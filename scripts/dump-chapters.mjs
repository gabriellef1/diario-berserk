// Imprime os resumos de uma faixa de volumes em texto plano (pra revisão).
// Uso: node --experimental-strip-types scripts/dump-chapters.mjs 6 10
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const [from, to] = process.argv.slice(2).map(Number)
for (let v = from; v <= to; v++) {
  const file = path.resolve(`src/data/chapters/vol-${String(v).padStart(2, '0')}.ts`)
  const mod = await import(pathToFileURL(file).href)
  const vol = mod.default
  console.log(`\n=== VOLUME ${vol.volume} ===`)
  for (const c of vol.chapters) {
    const flags = [c.hideTitleUntilRead ? 'título oculto' : '', c.needsReview ? 'needsReview' : '']
      .filter(Boolean)
      .join(', ')
    console.log(`\n[${c.number}] ${c.title}${flags ? ` (${flags})` : ''}\n${c.summary}`)
  }
}
