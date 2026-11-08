import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/controller/**/*.js',
        'src/services/**/*.js',
        'src/middleware/**/*.js',
        'src/utils/**/*.js',
        'src/config/**/*.js',
        'src/routes/**/*.js'
      ],
      exclude: [
        'src/server.js'
      ]
    }
  }
});
