import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts', 'src/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    passWithNoTests: true,
    reporters: ['default'],
    fileParallelism: false,
  },
});
