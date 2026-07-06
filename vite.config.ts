import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';

export default defineConfig({
  // Relative asset URLs so the client bundle also runs from a subpath
  // (e.g. GitHub Pages test hosting); Reddit's webview resolves them the same.
  base: './',
  plugins: [
    devvit({
      client: {
        build: {
          chunkSizeWarningLimit: 2000,
        },
      },
    }),
  ],
});
