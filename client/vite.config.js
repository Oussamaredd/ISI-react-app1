import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    open: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: "./src/tests/setup.ts",
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Exclude all test/setup files from instrumentation
      exclude: [
        '**/tests/**',      // All test files
        '**/setup*.ts',     // Specifically setup files
        '**/node_modules/**',
        '**/*.config.*',    // Configs
      ],
      include: ['src/**/*.{ts,tsx}'],
    }
  }
})
