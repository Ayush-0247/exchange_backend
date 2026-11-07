export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**']
  },
  {
    files: ['src/**/*.js', 'bench/**/*.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/engine/**/*.js', 'src/money/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['pg', 'express', 'node:*', 'fs', 'http', 'net', 'crypto']
        }
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Date',
          property: 'now',
          message: 'No clock in the engine: pass ts in the command'
        },
        {
          object: 'Math',
          property: 'random',
          message: 'No randomness in the engine'
        }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'No clock in the engine: pass ts in the command'
        }
      ]
    }
  }
];
