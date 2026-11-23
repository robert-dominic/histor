/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // "@/..." means "src/...". Keep in step with "paths" in tsconfig.app.json.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // At most two test files at once, so the full suite uses less memory.
    maxWorkers: 2,
    // A faster getComputedStyle for the story's animated words and letters in jsdom (src/test/setup.ts).
    setupFiles: ['./src/test/setup.ts'],
  },
})
