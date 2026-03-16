/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vellor-red': '#ff0033',
      },
      animation: {
        'shimmer': 'shimmer 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'premium': '0 0 0 1px rgba(255, 255, 255, 0.05), 0 10px 40px -10px rgba(0, 0, 0, 0.5), 0 0 80px -20px rgba(255, 0, 51, 0.15)',
        'glow-red': '0 0 40px -10px rgba(255, 0, 51, 0.4)',
        'glow-accent': '0 0 40px -10px var(--accent)',
      },
    },
  },
  plugins: [],
}
