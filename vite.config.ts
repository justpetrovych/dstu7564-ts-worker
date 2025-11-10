import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base path for GitHub Pages deployment
  // Format: /<REPO_NAME>/
  base: '/dstu7564-ts-worker/',

  // Build configuration
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild', // Use esbuild instead of terser (included by default)
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },

  // Web Worker configuration for ES Module support
  worker: {
    format: 'es',
    plugins: () => [], // Now a function that returns an array
  },

  // Server configuration for development
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    // Cross-Origin headers for SharedArrayBuffer support in development
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // Preview server configuration
  preview: {
    port: 3000,
    strictPort: false,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // Optimization
  optimizeDeps: {
    exclude: ['*.wasm'],
  },
});
