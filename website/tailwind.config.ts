import type {Config} from 'tailwindcss';

const config: Config = {
  corePlugins: {
    preflight: false,
  },
  content: [
    './docs/**/*.{md,mdx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './blog/**/*.{md,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        /* Homepage tokens (set on .forge-home in custom.css per color mode) */
        fh: {
          page: 'var(--fh-page)',
          heading: 'var(--fh-heading)',
          muted: 'var(--fh-muted)',
          subtle: 'var(--fh-subtle)',
          faint: 'var(--fh-faint)',
          edge: 'var(--fh-edge)',
          edge2: 'var(--fh-edge2)',
          surface: 'var(--fh-surface)',
          panel: 'var(--fh-panel)',
          install: 'var(--fh-install-bg)',
          installStroke: 'var(--fh-install-stroke)',
          ctaBand: 'var(--fh-cta-band)',
          nested: 'var(--fh-nested-bg)',
          nestedStroke: 'var(--fh-nested-stroke)',
          gutter: 'var(--fh-gutter)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
