/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        clonelink: {
          lightBg: '#FAFAFA',
          lightSurface: '#FFFFFF',
          lightBorder: '#E5E7EB',
          indigo: '#4F46E5',
          indigoHover: '#4338CA',
          emerald: '#10B981',
          emeraldHover: '#059669',
          darkBg: '#090D16',
          darkSurface: '#111827',
          darkCard: '#131B2E',
          darkBorder: '#1F2937',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'clean': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'clean-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'dark-glow': '0 0 20px -5px rgba(16, 185, 129, 0.15)',
        'indigo-glow': '0 0 20px -5px rgba(79, 70, 229, 0.25)',
      }
    },
  },
  plugins: [],
};
