/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#e6f7f7',
            100: '#b3e6e6',
            200: '#80d4d4',
            300: '#4dc3c3',
            400: '#26b5b5',
            500: '#00a8a8',
            600: '#008f8f',
            700: '#007575',
            800: '#005c5c',
            900: '#004242',
          },
          secondary: {
            50: '#f0f4f8',
            100: '#d9e2ec',
            200: '#bcccdc',
            300: '#9fb3c8',
            400: '#829ab1',
            500: '#627d98',
            600: '#486581',
            700: '#334e68',
            800: '#243b53',
            900: '#102a43',
          },
          accent: {
            50: '#fff8e6',
            100: '#ffeab3',
            200: '#ffdc80',
            300: '#ffce4d',
            400: '#ffc426',
            500: '#ffba00',
            600: '#d99e00',
            700: '#b38200',
            800: '#8c6600',
            900: '#664a00',
          },
          success: { 500: '#10b981', 600: '#059669' },
          warning: { 500: '#f59e0b', 600: '#d97706' },
          danger: { 500: '#ef4444', 600: '#dc2626' },
          healthcare: {
            light: '#f0fdfa',
            muted: '#e6fffa',
            soft: '#ccfbf1',
          }
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        },
        boxShadow: {
          'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
          'card': '0 4px 6px -1px rgba(0, 168, 168, 0.1), 0 2px 4px -2px rgba(0, 168, 168, 0.1)',
          'glow': '0 0 20px rgba(0, 168, 168, 0.3)',
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'float': 'float 3s ease-in-out infinite',
          'slide-up': 'slideUp 0.3s ease-out',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-10px)' },
          },
          slideUp: {
            '0%': { transform: 'translateY(10px)', opacity: 0 },
            '100%': { transform: 'translateY(0)', opacity: 1 },
          }
        }
      },
    },
    plugins: [],
  }