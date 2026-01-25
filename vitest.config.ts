import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      '__tests__/**/*.test.ts',
      'src/**/__tests__/**/*.test.ts',
      'src/**/*.test.ts'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: [
        'src/client/auth-providers/**/*.ts',
        'src/client/auth.ts',
        'src/environment.ts',
        'src/index.ts',
        'src/utils/settings.ts'
      ],
      exclude: [
        'src/**/__tests__/**',
        '**/types.ts',
        'scripts/**'
      ],
      thresholds: {
        100: true
      }
    },
  },
});
