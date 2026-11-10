// Gera os PNGs do PWA a partir do SVG original (Chromium do Playwright).
// Uso: node scripts/icons.mjs
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()

for (const [size, name] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png'],
]) {
  await page.setViewportSize({ width: size, height: size })
  // Fundo cheio + marca em 72%: cabe na zona segura de ícone "maskable".
  await page.setContent(
    `<body style="margin:0;background:#141210;display:grid;place-items:center;height:100vh">
      <div style="width:72%;height:72%">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    </body>`,
  )
  await page.screenshot({ path: `public/${name}` })
}
await browser.close()
console.log('ícones gerados')
