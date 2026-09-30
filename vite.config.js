import { defineConfig } from 'vite';

// base relativo para que funcione en cualquier ruta de Vercel / subcarpetas
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    // los GeoJSON grandes viven en public/ y se sirven como estáticos,
    // no se empaquetan en el bundle JS
    assetsInlineLimit: 0,
  },
});
