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
        maroon: {
          50: '#FDF2F4',
          100: '#FCE7EB',
          200: '#F9D2D9',
          300: '#F4ADC0',
          400: '#EC7A96',
          500: '#DE4B71',
          600: '#C22650',
          700: '#800020',
          800: '#721026',
          900: '#5C0B1D',
          950: '#2A020B',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          canvas: '#FFFFFF',
          subtle: '#F8F9FA',
          elevated: '#FFFFFF',
          muted: '#F1F3F4',
        },
        border: {
          DEFAULT: '#DADCE0',
          subtle: '#E2E8F0',
        },
        google: {
          border: '#DADCE0',
          subtle: '#E2E8F0',
          surface: '#F8F9FA',
          card: '#FFFFFF',
          text: '#1F2937',
          muted: '#4B5563',
        },
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
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(60, 64, 67, 0.1), 0 1px 3px 1px rgba(60, 64, 67, 0.05)',
        'sm': '0 1px 3px 0 rgba(60, 64, 67, 0.12), 0 1px 2px -1px rgba(60, 64, 67, 0.08)',
        'md': '0 4px 6px -1px rgba(60, 64, 67, 0.12), 0 2px 4px -2px rgba(60, 64, 67, 0.08)',
        'lg': '0 10px 15px -3px rgba(60, 64, 67, 0.12), 0 4px 6px -4px rgba(60, 64, 67, 0.08)',
        'card': '0 1px 3px 0 rgba(60, 64, 67, 0.1), 0 1px 2px -1px rgba(60, 64, 67, 0.06)',
        'card-hover': '0 4px 12px 0 rgba(60, 64, 67, 0.15), 0 1px 3px 0 rgba(60, 64, 67, 0.08)',
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
