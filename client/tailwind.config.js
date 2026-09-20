/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sentosa: {
          blue: '#6492b3',
          'blue-light': '#e8eff4',
          'blue-dark': '#4f7897',
          offwhite: '#ebeae7',
          stone: '#bdb8ad',
          'stone-light': '#f4f3f0',
          taupe: '#8d7d6d',
          charcoal: '#5b554f',
          'charcoal-dark': '#3a3530',
        },
        cream: {
          50: '#fdfcf9',
          100: '#faf8f5', // Main natural warm background
          200: '#f4efe6', // Secondary soft stone
          300: '#eae4d9', // Subtle hairline borders
          400: '#ded5c5',
          500: '#c8bcab',
        },
        charcoal: {
          500: '#78716c',
          600: '#57534e', // Warm secondary text
          700: '#44403c',
          800: '#292524',
          900: '#1c1917', // Primary deep charcoal text
          950: '#12100e', // Deepest near-black
        },
        bronze: {
          50: '#fbf7f0',
          100: '#f5ebe0',
          200: '#e8d4c0',
          300: '#d7b79a',
          400: '#bf9470',
          500: '#9b6c46',
          600: '#78350f', // Primary refined accent
          700: '#5c2b0c',
          800: '#431f0a',
          900: '#2e1507',
        },
        semantic: {
          success: '#2d6a4f',
          'success-bg': '#f0f7f3',
          'success-border': '#c8e4d3',
          warning: '#b45309',
          'warning-bg': '#fdf8f0',
          'warning-border': '#f5dfbe',
          danger: '#991b1b',
          'danger-bg': '#fdf2f2',
          'danger-border': '#f7cfcf',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      letterSpacing: {
        'display': '-0.025em',
        'heading': '-0.015em',
        'body': '0',
        'caption': '+0.01em',
        'badge': '+0.02em',
      },
      boxShadow: {
        '2xs': '0 1px 2px rgba(28, 25, 23, 0.03)',
        'subtle': '0 1px 3px rgba(28, 25, 23, 0.04), 0 1px 2px rgba(28, 25, 23, 0.02)',
        'card': '0 1px 3px rgba(28, 25, 23, 0.05), 0 6px 16px -4px rgba(28, 25, 23, 0.03)',
        'lift': '0 4px 16px rgba(28, 25, 23, 0.07)',
        'sheet': '0 -8px 28px -6px rgba(28, 25, 23, 0.12)',
        'modal': '0 20px 40px -15px rgba(28, 25, 23, 0.15)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.2, 0, 0, 1)',
        'apple-spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.1)',
      }
    },
  },
  plugins: [],
}

