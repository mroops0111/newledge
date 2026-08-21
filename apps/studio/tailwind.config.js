/**
 * Newledge design tokens.
 * The palette is warm and low contrast where you read,
 * and precise where you operate,
 * so one system carries both the reading inbox and the board.
 * Components name tokens by role, never by a raw scale value.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Every colour resolves to the variables declared in index.css,
      // so a utility class and a canvas stroke cannot drift apart.
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        guide: 'var(--guide)',
        section: 'var(--section)',
        'section-line': 'var(--section-line)',

        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
          subtle: 'var(--ink-subtle)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        },

        concept: 'var(--concept)',
        claim: 'var(--claim)',
        source: 'var(--source)',
        topic: 'var(--topic)',
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
        // One reading column, capped near 75 characters,
        // past which the eye loses the start of the next line.
        column: '48rem',
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
