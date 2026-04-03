/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        toolbar: '#1a1a1a',
        panel: '#242424',
        canvas: '#111111',
        accent: '#3b82f6',
        'panel-border': '#333333',
        'slider-track': '#3a3a3a',
        'slider-thumb': '#3b82f6',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
