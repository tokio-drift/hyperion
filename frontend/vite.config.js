import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  // During dev, all routes fall back to index.html so client routing works
  server: {
    historyApiFallback: true,
  },
  // Ensure build output is predictable for server.js path references
  build: {
    outDir: 'dist',
  },
})
