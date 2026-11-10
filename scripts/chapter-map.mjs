// Imprime o mapa volume → capítulos (número | título em inglês da Wikipédia) pra montar os lotes.
// Uso: node scripts/chapter-map.mjs 6 10
import { readFileSync } from 'node:fs'
const titles = JSON.parse(readFileSync(new URL('./chapter-titles.json', import.meta.url), 'utf8'))
const [from, to] = process.argv.slice(2).map(Number)
for (const [vol, list] of Object.entries(titles)) {
  const v = Number(vol)
  if (v < from || v > to) continue
  console.log(`Volume ${v}`)
  for (const [num, title] of list) console.log(`  ${num} | ${title}`)
}
