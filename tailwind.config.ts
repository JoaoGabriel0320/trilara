// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Identidade Trilara: verde água sobre azul profundo.
        brand: {
          50:  '#e9faf6',
          100: '#cef5ec',
          200: '#9debdc',
          300: '#5ce0cc',
          400: '#2ac9b5',
          500: '#12aa99',
          600: '#0b8b80',
          700: '#0d706a',
          800: '#0e5754',
          900: '#0b3b3b',
        },
        // neutros customizados (mais quentes que gray)
        ink: {
          50:  '#f5faf9',
          100: '#eaf2f0',
          200: '#d7e5e2',
          300: '#b8cbc8',
          400: '#839e9c',
          500: '#607a7b',
          600: '#47616a',
          700: '#304754',
          800: '#192d3b',
          900: '#0b1724',
        },
      },
      keyframes: {
        'marquee':    { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'bar-grow':   { from: { transform: 'scaleY(0.2)' },   to: { transform: 'scaleY(1)' } },
        'panel-in':   {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          to:   { opacity: '1', transform: 'translateY(0)    scale(1)'    },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)',    opacity: '0.4' },
          '40%':           { transform: 'translateY(-3px)', opacity: '1'   },
        },
      },
      animation: {
        'marquee':    'marquee 32s linear infinite',
        'bar-grow':   'bar-grow 1.4s cubic-bezier(.2,.7,.2,1) both',
        'panel-in':   'panel-in .22s cubic-bezier(.2,.7,.2,1) both',
        'bounce-dot': 'bounce-dot 1.2s ease infinite',
      },
    },
  },
  plugins: [],
}
export default config
