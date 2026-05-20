import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#dde8ed',
        surface: '#ffffff',
        brand: {
          DEFAULT: '#f5a623',
          light: '#fef3dc',
          dark: '#d4891a',
        },
        hot: '#ef4444',
        warm: '#f5a623',
        cold: '#6b7280',
        sidebar: {
          DEFAULT: '#ffffff',
          active: '#f5a623',
        },
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}

export default config
