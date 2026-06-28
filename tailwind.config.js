/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        feed: {
          bg: '#0f0f0f',
          card: '#1a1a1a',
          border: '#2a2a2a',
          accent: '#7c3aed',
        },
      },
    },
  },
  plugins: [],
}
