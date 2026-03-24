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
          bg: '#0d0d0d',
          surface: '#1a1a1a',
          card: '#1e1e1e',
          border: '#2e2e2e',
          orange: '#ff5c00',
          yellow: '#ffd600',
          coral: '#ff6b6b',
          text: '#f5f5f5',
          muted: '#a3a3a3',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out 2s infinite',
        'float-slow': 'float 10s ease-in-out 4s infinite',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'steam': 'steam-rise 2s ease-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'grain': 'grain 8s steps(10) infinite',
        'bounce-in': 'bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'count-up': 'count-up 0.3s ease-out',
        'ripple': 'ripple 0.6s ease-out',
        'checkmark': 'checkmark 0.5s ease-in-out forwards',
        'scooter': 'scooter-drive 2s ease-in-out infinite',
        'typewriter': 'typewriter 3s steps(30) infinite',
        'stagger-in': 'stagger-in 0.05s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(5deg)' },
        },
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px #ff5c00, 0 0 20px #ff5c00, 0 0 40px #ff5c0066' },
          '50%': { boxShadow: '0 0 10px #ff5c00, 0 0 40px #ff5c00, 0 0 80px #ff5c0066' },
        },
        'steam-rise': {
          '0%': { transform: 'translateY(0) scaleX(1)', opacity: '0.5' },
          '50%': { transform: 'translateY(-15px) scaleX(1.2)', opacity: '0.3' },
          '100%': { transform: 'translateY(-30px) scaleX(0.8)', opacity: '0' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px) rotate(-5deg)' },
          '75%': { transform: 'translateX(4px) rotate(5deg)' },
        },
        'grain': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '20%': { transform: 'translate(-15%, 5%)' },
          '30%': { transform: 'translate(7%, -25%)' },
          '40%': { transform: 'translate(-5%, 25%)' },
          '50%': { transform: 'translate(-15%, 10%)' },
          '60%': { transform: 'translate(15%, 0%)' },
          '70%': { transform: 'translate(0%, 15%)' },
          '80%': { transform: 'translate(3%, 35%)' },
          '90%': { transform: 'translate(-10%, 10%)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'count-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        'checkmark': {
          '0%': { transform: 'scale(0) rotate(-45deg)', opacity: '0' },
          '50%': { transform: 'scale(1.3) rotate(-45deg)' },
          '100%': { transform: 'scale(1) rotate(-45deg)', opacity: '1' },
        },
        'scooter-drive': {
          '0%, 100%': { transform: 'translateY(0)' },
          '25%': { transform: 'translateY(-3px)' },
          '75%': { transform: 'translateY(3px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.3)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
