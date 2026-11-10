// Gera screenshots de todas as telas (375px e desktop) a partir do build.
// Uso: npm run build && node scripts/screens.mjs [pasta]   (padrão: .screenshots)
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const dir = path.resolve(process.argv[2] ?? '.screenshots')
mkdirSync(dir, { recursive: true })

const result = spawnSync('npx', ['playwright', 'test', 'e2e/screens.spec.ts'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, SCREENSHOT_DIR: dir },
})

if (result.status === 0) console.log(`Screenshots em ${dir}`)
process.exit(result.status ?? 1)
