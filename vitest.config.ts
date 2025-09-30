import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['workers/**/*.spec.ts', 'workers/**/__tests__/**/*.spec.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['workers/**/*.ts'],
      exclude: ['workers/**/*.d.ts']
    }
  }
});
