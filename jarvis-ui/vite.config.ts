import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 10201,
    proxy: {
      '/api': 'http://localhost:10200',
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
  },
})
