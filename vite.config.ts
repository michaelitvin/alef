/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
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
        duel2: fileURLToPath(new URL('./duel2/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
