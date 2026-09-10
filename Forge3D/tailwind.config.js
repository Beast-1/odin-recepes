/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: '#0c0e11',
        panel: '#15181c',
        raised: '#1b1f24',
        sunken: '#101317',
        hover: '#22272d',
        line: '#262b32',
        'line-strong': '#343b44',
        ink: '#e6e9ec',
        muted: '#98a1ab',
        dim: '#6a737e',
        accent: '#4c8dff',
        'accent-dim': '#2f5fb0',
        select: '#ff9d4d',
        danger: '#e5484d',
        ok: '#43b581',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
        sm: ['12px', '18px'],
        base: ['13px', '20px'],
        md: ['14px', '21px'],
      },
      boxShadow: {
        pop: '0 8px 28px -6px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05)',
      },
      transitionDuration: {
        DEFAULT: '120ms',
      },
    },
  },
  plugins: [],
}
