import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import invoiceApi from './src/api/invoice.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'invoice-api',
      configureServer(server) {
        server.middlewares.use(invoiceApi)
      },
      configurePreviewServer(server) {
        server.middlewares.use(invoiceApi)
      },
    },
    react(),
    tailwindcss(),
  ],
})
