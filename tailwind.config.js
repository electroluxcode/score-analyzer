/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#000000',
          surface: '#1C1C1E',
          surface2: '#2C2C2E',
          surface3: '#3A3A3C',
          border: '#38383A',
          text: '#FFFFFF',
          textSecondary: '#EBEBF5',
          textTertiary: '#EBEBF599',
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}
