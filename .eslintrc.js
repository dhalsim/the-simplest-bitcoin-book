module.exports = {
  root: true,
  parser: '@html-eslint/parser',
  plugins: ['@html-eslint'],
  extends: ['eslint:recommended'],
  rules: {
    'multiline-siblings': 'error'
  },
  overrides: [
    {
      files: ['*.html'],
      parser: '@html-eslint/parser'
    }
  ]
};