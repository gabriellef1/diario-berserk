import { defineConfig, devices } from '@playwright/test'

// Roda contra o build de produção (vite preview). Fluxo principal em 375px e desktop.
// No CI o build usa VITE_BASE_PATH=/diario-berserk/, então o preview serve nesse subpath.
const basePath = process.env.VITE_BASE_PATH ?? '/'
const localUrl = `http://localhost:4173${basePath.startsWith('/') ? '' : '/'}${basePath}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // O fundo animado roda por software no headless: mais de 2 navegadores disputam CPU e estouram timeout.
  workers: process.env.CI ? 1 : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? localUrl,
    trace: 'retain-on-failure',
    // O service worker do PWA não pode interferir em reload e localStorage dos testes.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'mobile-375',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run preview -- --port 4173 --strictPort',
        url: localUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
