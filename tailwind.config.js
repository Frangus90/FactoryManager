/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        factorio: {
          orange: '#e09020',
          dark: '#313031',
          darker: '#242324',
          panel: '#3d3d3d',
          border: '#505050',
          highlight: '#5a5a5a',
          shadow: '#1a1a1a',
          green: '#5eb663',
          'green-hover': '#6ec873',
          'input-bg': '#2a2a2a',
          text: '#e0e0e0',
          muted: '#999',
        },
      },
    },
  },
  plugins: [],
};
