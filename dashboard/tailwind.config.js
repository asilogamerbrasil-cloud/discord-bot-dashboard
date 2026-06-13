/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        discord: {
          blurple: '#5865F2',
          dark: '#313338',
          darker: '#2B2D31',
          darkest: '#1E1F22',
          light: '#B5BAC1',
          lighter: '#DBDEE1',
        },
      },
    },
  },
  plugins: [],
};
