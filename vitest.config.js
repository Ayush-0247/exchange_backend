import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/engine/**/*.js',
        'src/money/**/*.js',
        'src/rules/**/*.js'
      ],
      exclude: [
        'src/engine/index.js',
        'src/money/index.js',
        'src/rules/index.js'
      ],
      thresholds: {
        lines: 95,
        branches: 95,
        functions: 95,
        statements: 95
      }
    }
  }
});
