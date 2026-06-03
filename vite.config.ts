import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Plug in GH repo name
  base: "/ArcGIS_SDK_UDP/",
  server: {
    port: 5173,
    open: true
  }
})
