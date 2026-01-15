/** @type {import('tailwindcss').Config} */

const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/**/*.{js,mjs}",
    "!./node_modules/**/*.{js,mjs}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#3b82f6',
          500: '#1e40af',
          600: '#2563eb',
          700: '#1e40af',
          800: '#111827',
          950: '#1e3a8a',
        },
        secondary: {
          50: '#6b7280',
          500: '#38bdf8',
          600: '#2563eb',
          700: '#374151',
          800: '#4f46e5',
        },
        success: {
          50: '#10b981',
          500: '#059669',
          600: '#047a1',
          700: '#036d1',
          800: '#027048',
        },
        warning: {
          50: '#f59e0b',
          500: '#d97706',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0d',
        },
        error: {
          50: '#ef4444',
          500: '#dc2626',
          600: '#b91c0c',
          700: '#991b1b',
          800: '#7c2c12',
        },
        info: {
          50: '#3b82f6',
          500: '#60a5fa',
          600: '#4299e1',
          700: '#365a77',
          800: '#1e40af',
        }
      }
    }
  },
  plugins: [
    // Enable animations and transitions
    require('@tailwindcss/animate'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    // LSP configuration for better dev experience
    {
      name: '@tailwindcss/typography',
      options: {
        types: 'module',
      cssSide: 'theme',
        border: false,
        mode: 'all'
      }
    }
  ],
};

export default config;