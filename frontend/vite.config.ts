import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Порт берём из .env-блока проекта (см. корневой .env / scripts/ports.sh).
// strictPort: лучше упасть с понятной ошибкой, чем молча уехать на другой порт.
const port = Number(process.env.FRONTEND_PORT) || 5173

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port,
    strictPort: true,
  },
  preview: {
    port,
    strictPort: true,
  },
})
