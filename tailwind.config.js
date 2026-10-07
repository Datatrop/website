/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // `white` is the public site's foreground colour: white in dark mode,
        // dark maroon in light mode (see --fg in index.css). Elsewhere --fg is
        // unset, so it stays plain white.
        white: 'rgb(var(--fg, 255 255 255) / <alpha-value>)',
        // Datatrop brand palette (grape → maroon → black)
        grape: { DEFAULT: '#6B1E72', bright: '#8A2A91', deep: '#54133F' },
        maroon: { DEFAULT: '#3A0B20', dark: '#1B050D' },
        ink: '#070305',
        rose: { DEFAULT: '#E0457B', soft: '#F08DB0' },
        brand: {
          cyan: '#67E8F9',
          'cyan-bright': '#00BFFF',
        },
      },
    },
  },
  plugins: [],
}
