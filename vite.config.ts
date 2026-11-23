/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import yaml from '@rollup/plugin-yaml'
import { fileURLToPath } from 'node:url'

// Production (release) is served at /alef/, staging (main) at /alef/staging/: the deploy workflow sets ALEF_STAGING=1.
const base = process.env.ALEF_STAGING === '1' ? '/alef/staging/' : '/alef/'

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react(), yaml()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        clock: fileURLToPath(new URL('./clock/index.html', import.meta.url)),
        spellquest: fileURLToPath(new URL('./spellquest/index.html', import.meta.url)),
        duel2: fileURLToPath(new URL('./duel2/index.html', import.meta.url)), // redirects to spellquest/
        spacecat: fileURLToPath(new URL('./spacecat/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // agents' git worktrees live under .claude/worktrees: never run their copies of the tests
    exclude: [...configDefaults.exclude, '.claude/**'],
    // keep local runs light (parallel agents); CI uses the default
    maxWorkers: process.env.CI ? undefined : 2,
    // heavy tests timed out at the 5 s default under load; the slowest keep their own 60 s
    testTimeout: 20000,
  },
})
