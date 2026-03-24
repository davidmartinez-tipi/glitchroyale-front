import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 1. Asegura que las rutas empiecen desde la raíz
  base: '/', 
  build: {
    // 2. Confirmamos que la carpeta de salida es 'dist'
    outDir: 'dist',
    // 3. Esto ayuda a limpiar archivos viejos antes de cada build
    emptyOutDir: true,
  }
})