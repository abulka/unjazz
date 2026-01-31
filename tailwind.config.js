/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soundcloud: {
          orange: '#ff5500',
          'orange-dark': '#ff3300',
          'gray-dark': '#111',
          'gray-medium': '#333',
          'gray-light': '#666'
        }
      }
    },
  },
  plugins: [],
}
