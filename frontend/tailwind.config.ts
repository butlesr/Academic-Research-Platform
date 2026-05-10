import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        academic: {
          navy:    '#1e3a5f',
          blue:    '#2196F3',
          teal:    '#0891b2',
          emerald: '#059669',
          amber:   '#d97706',
          rose:    '#e11d48',
          purple:  '#7c3aed',
        },
        status: {
          completed:  '#10b981',
          inProgress: '#f59e0b',
          partial:    '#f97316',
          delayed:    '#ef4444',
          notStarted: '#6b7280',
          needHelp:   '#8b5cf6',
          submitted:  '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'pulse-ring': { '0%,100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.1)', opacity: '0.7' } },
      },
      animation: {
        'fade-in':    'fade-in 0.2s ease-out',
        'slide-in':   'slide-in 0.3s ease-out',
        'pulse-ring': 'pulse-ring 2s infinite',
      },
      backgroundImage: {
        'gradient-academic': 'linear-gradient(135deg, #1e3a5f 0%, #2196F3 50%, #0891b2 100%)',
        'gradient-card':     'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
