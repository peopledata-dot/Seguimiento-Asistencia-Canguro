/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canguro: {
          black: '#050505',
          gold: '#facc15',
          card: '#121212'
        }
      }
    },
  },
  plugins: [],
}