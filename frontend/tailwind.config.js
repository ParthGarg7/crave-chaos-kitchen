/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crave: {
          bg: '#050505',
          surface: '#0a0a0a',
          card: '#121212',
          border: '#1E1E1E',
          accent: '#FF4500',
          'accent-hover': '#E03C00',
          'accent-glow': 'rgba(255, 69, 0, 0.4)',
          'text-primary': '#F5F5F7',
          'text-secondary': '#A1A1AA',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'steam': 'steam-rise 2s ease-out infinite',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px #FF4500, 0 0 20px rgba(255, 69, 0, 0.4)' },
          '50%': { boxShadow: '0 0 10px #FF4500, 0 0 40px rgba(255, 69, 0, 0.6)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'steam-rise': {
          '0%': { transform: 'translateY(0) scaleX(1)', opacity: '0.5' },
          '50%': { transform: 'translateY(-10px) scaleX(1.1)', opacity: '0.3' },
          '100%': { transform: 'translateY(-20px) scaleX(0.9)', opacity: '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
