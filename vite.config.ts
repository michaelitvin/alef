import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import yaml from '@rollup/plugin-yaml'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/alef/',
  plugins: [react(), yaml()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
