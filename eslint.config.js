import js from '@eslint/js';
import globals from 'globals';

/**
 * Lint minimal : détecte les erreurs réelles (variables non définies, code
 * inatteignable, variables et membres privés inutilisés) sans imposer de style.
 * Lancer avec `npm run lint`.
 */
export default [
  {
    ignores: ['node_modules/', 'public/assets/data/', 'uploads/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-private-class-members': 'warn',
    },
  },
  {
    // Code exécuté dans le navigateur (Leaflet et Turf sont chargés depuis un CDN).
    files: ['src/**/*.js', 'public/**/*.js'],
    ignores: ['src/backend/**'],
    languageOptions: {
      globals: {
        ...globals.browser,
        L: 'readonly',
        turf: 'readonly',
        google: 'readonly',
      },
    },
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.serviceworker },
    },
  },
];
