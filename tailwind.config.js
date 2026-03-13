/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        factorio: {
          orange: '#f5a623',
          dark: '#1a1a2e',
          darker: '#0f0f1a',
          panel: '#16213e',
          border: '#2a2a4a',
          text: '#e0e0e0',
          muted: '#888',
        },
      },
    },
  },
  plugins: [],
};
