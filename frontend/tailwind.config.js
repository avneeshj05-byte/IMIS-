/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#F3F4F2',
        'bg-secondary': '#FFFFFF',
        'sidebar': '#17251F',
        'accent-primary': '#315C49',
        'accent-secondary': '#8DAA91',
        'text-primary': '#202A25',
        'text-secondary': '#737D76',
        'warning': '#D69A36',
        'critical': '#B84C42',
        'border': '#DDE2DD',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        sans: ['IBM Plex Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
