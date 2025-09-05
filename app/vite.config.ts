import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages project site: https://mikhailsal.github.io/seasonal-random-anime/
// Assets must resolve from the repository subpath.
export default defineConfig({
  base: '/seasonal-random-anime/',
  plugins: [react()]
});