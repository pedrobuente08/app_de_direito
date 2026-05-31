import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        pauta: {
          paper: 'var(--paper)',
          'paper-2': 'var(--paper-2)',
          card: 'var(--card)',
          'card-2': 'var(--card-2)',
          ink: 'var(--ink)',
          'ink-soft': 'var(--ink-soft)',
          muted: 'var(--muted)',
          faint: 'var(--faint)',
          line: 'var(--line)',
          'line-2': 'var(--line-2)',
          'forest-deep': 'var(--forest-deep)',
          forest: 'var(--forest)',
          'forest-2': 'var(--forest-2)',
          sage: 'var(--sage)',
          ochre: 'var(--ochre)',
          clay: 'var(--clay)',
          pos: 'var(--pos)',
          'pos-bg': 'var(--pos-bg)',
          'wa-bg': 'var(--wa-bg)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Fraunces', 'serif'],
        sans: ['var(--font-sans)', 'Hanken Grotesk', 'sans-serif'],
        mono: ['var(--font-mono)', 'Geist Mono', 'monospace'],
      },
      borderRadius: {
        'pauta-sm': 'var(--radius-pauta-sm)',
        'pauta-md': 'var(--radius-pauta-md)',
        'pauta-lg': 'var(--radius-pauta-lg)',
        'pauta-xl': 'var(--radius-pauta-xl)',
        lg: 'var(--radius-pauta-lg)',
        md: 'var(--radius-pauta-md)',
        sm: 'var(--radius-pauta-sm)',
      },
      maxWidth: {
        pauta: 'var(--content-max-width)',
      },
      boxShadow: {
        'pauta-xs': 'var(--shadow-pauta-xs)',
        'pauta-sm': 'var(--shadow-pauta-sm)',
        'pauta-md': 'var(--shadow-pauta-md)',
      },
    },
  },
  plugins: [],
};
export default config;
