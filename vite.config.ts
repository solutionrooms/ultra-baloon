import { defineConfig } from 'vite';

// Deployed to GitHub Pages at https://solutionrooms.github.io/ultra-baloon/
export default defineConfig({
  root: '.',
  base: '/ultra-baloon/',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
});
