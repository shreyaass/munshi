import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { mockSheetPlugin } from './dev/mockSheetPlugin';

export default defineConfig({
  plugins: [react(), tailwindcss(), mockSheetPlugin()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
