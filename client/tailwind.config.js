/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14221c',
        board: '#1b3027',
        chalk: '#f3f6f4',
        mist: '#d9e2dc',
        gold: '#c4923a',
        leaf: '#1f7a4d',
        clay: '#a33b32',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 16px 40px rgba(20, 34, 28, 0.08)',
      },
    },
  },
  plugins: [],
};
