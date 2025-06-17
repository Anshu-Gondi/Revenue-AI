// vite.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // 👈 fixes the "document is not defined" error
    globals: true,
  },
});
