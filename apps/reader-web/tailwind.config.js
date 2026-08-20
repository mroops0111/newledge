/**
 * Newledge design tokens.
 * The palette is warm and low contrast where you read, and precise where you
 * operate, so one system carries both the reading inbox and the board.
 * Components name tokens by role, never by a raw scale value.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces, warm rather than blue grey, so long reading stays easy.
        canvas: '#faf9f7',
        surface: '#ffffff',
        raised: '#f5f3f0',

        ink: {
          DEFAULT: '#1c1917',
          muted: '#57534e',
          subtle: '#8a8378',
        },
        line: {
          DEFAULT: '#e7e3dd',
          strong: '#d3cec5',
        },

        // Accent carries the one action that matters, absorbing a reading.
        accent: {
          DEFAULT: '#1c1917',
          hover: '#3b3734',
        },

        // Ontology colours, shared with the graph so a concept reads the same
        // on a card and on the board.
        concept: '#7c3aed',
        claim: '#dc2626',
        source: '#0284c7',
        topic: '#d97706',
      },
      fontFamily: {
        // Reading runs on a serif, the interface on the system stack.
        reading: ['Charter', 'Georgia', 'Cambria', 'serif'],
        ui: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        // Reading sizes carry generous leading, interface sizes stay tight.
        prose: ['1.0625rem', { lineHeight: '1.7' }],
        'prose-sm': ['0.9375rem', { lineHeight: '1.6' }],
        label: ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.04em' }],
      },
      maxWidth: {
        // A reading column caps around 75 characters, past which the eye loses
        // the start of the next line. The card holding it can run wider.
        reading: '46rem',
        column: '56rem',
      },
      borderRadius: {
        card: '0.625rem',
        control: '0.375rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(28 25 23 / 0.04), 0 1px 3px rgb(28 25 23 / 0.06)',
        lifted: '0 2px 4px rgb(28 25 23 / 0.06), 0 4px 12px rgb(28 25 23 / 0.08)',
      },
    },
  },
  plugins: [],
}
