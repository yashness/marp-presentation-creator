/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef4fb',
          100: '#d8e6f6',
          200: '#b7d2ee',
          300: '#8ab6e3',
          400: '#5b94d6',
          500: '#0a66c2',
          600: '#084f9a',
          700: '#063f7a',
          800: '#053463',
          900: '#032a51',
          950: '#021f3d',
        },
        secondary: {
          50: '#e9f1f8',
          100: '#d5e3f1',
          200: '#aac7e6',
          300: '#7fa9d6',
          400: '#4d82c2',
          500: '#1f5ea8',
          600: '#154a87',
          700: '#113d73',
          800: '#0d315e',
          900: '#0a2a51',
          950: '#051a34',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
