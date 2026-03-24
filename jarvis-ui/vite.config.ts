import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 10500,
    proxy: {
      '/api': 'http://localhost:10400',
    },
  },
  resolve: {
    alias: {
      '@jarvis/design-system': path.resolve(__dirname, 'src/design-system/index.ts'),
    },
    dedupe: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
  },
})
