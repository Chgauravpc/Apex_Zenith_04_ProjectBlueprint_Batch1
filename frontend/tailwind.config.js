/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          bg: '#0B1120',
          nav: '#101827',
          card: '#172337',
          elevated: '#1D2B40',
          accent: '#22D3EE',
          border: '#2B3A50',
          borderHover: '#3D4F6C',
          text: '#F1F5F9',
          muted: '#A7B5C9',
        },
        slate: {
          950: '#070D18',
          900: '#0B1120', // Main background
          850: '#101827', // Navigation background
          800: '#172337', // Card background
          750: '#1D2B40', // Elevated surfaces
          700: '#2B3A50', // Borders
          600: '#3D4F6C', // Interactive border
          500: '#64748B',
          400: '#A7B5C9', // Secondary text
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9', // Primary text
          50: '#F8FAFC',
        },
        steel: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        caution: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        hazard: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
