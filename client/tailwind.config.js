/** Colors are CSS variables (see src/index.css) so light/dark is one class switch. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'),
        surface: v('surface'),
        raised: v('raised'),
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        line: v('line'),
        brand: { DEFAULT: v('brand'), soft: v('brand-soft'), ink: v('brand-ink') },
        match: { DEFAULT: v('match'), soft: v('match-soft') },
        warn: { DEFAULT: v('warn'), soft: v('warn-soft') },
        danger: { DEFAULT: v('danger'), soft: v('danger-soft') },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Figtree', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      borderRadius: { panel: '16px', ctl: '10px' },
      boxShadow: {
        panel: '0 1px 0 rgb(var(--line) / 1), 0 12px 32px -18px rgb(var(--shadow) / 0.28)',
        pop: '0 18px 50px -20px rgb(var(--shadow) / 0.45)',
      },
      maxWidth: { page: '1180px' },
    },
  },
  plugins: [],
};
