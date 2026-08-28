import formsPlugin from '@tailwindcss/forms';
import containerQueriesPlugin from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surface & Background
        background: '#f8f9ff',
        'on-background': '#0d1c2e',
        surface: '#f8f9ff',
        'surface-dim': '#ccdbf3',
        'surface-bright': '#f8f9ff',
        'surface-variant': '#d5e3fc',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff4ff',
        'surface-container': '#e6eeff',
        'surface-container-high': '#dce9ff',
        'surface-container-highest': '#d5e3fc',
        'on-surface': '#0d1c2e',
        'on-surface-variant': '#3f484c',
        'inverse-surface': '#233144',
        'inverse-on-surface': '#eaf1ff',
        'surface-tint': '#006781',

        // Primary (Deep Teal)
        primary: '#005a71',
        'on-primary': '#ffffff',
        'primary-container': '#0e7490',
        'on-primary-container': '#d3f1ff',
        'primary-fixed': '#b9eaff',
        'primary-fixed-dim': '#81d1f0',
        'on-primary-fixed': '#001f29',
        'on-primary-fixed-variant': '#004d62',
        'inverse-primary': '#81d1f0',

        // Secondary (Mint Teal)
        secondary: '#006b5f',
        'on-secondary': '#ffffff',
        'secondary-container': '#62fae3',
        'on-secondary-container': '#007165',
        'secondary-fixed': '#62fae3',
        'secondary-fixed-dim': '#3cddc7',
        'on-secondary-fixed': '#00201c',
        'on-secondary-fixed-variant': '#005047',

        // Tertiary & Neutrals
        tertiary: '#4b5459',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#636c71',
        'on-tertiary-container': '#e5eef4',
        'tertiary-fixed': '#dbe4ea',
        'tertiary-fixed-dim': '#bfc8ce',
        'on-tertiary-fixed': '#141d21',
        'on-tertiary-fixed-variant': '#3f484d',
        outline: '#6f787d',
        'outline-variant': '#bec8cd',

        // Semantic Error
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
      },
      borderRadius: {
        DEFAULT: '0.25rem', // 4px
        sm: '0.25rem',     // 4px
        md: '0.5rem',       // 8px - Inputs, buttons
        lg: '0.5rem',       // 8px - compatibility
        xl: '0.75rem',      // 12px
        '2xl': '1rem',      // 16px - Cards
        '3xl': '1.5rem',    // 24px
        full: '9999px',     // Pills, Chips
      },
      spacing: {
        xs: '4px',
        base: '8px',
        sm: '12px',
        gutter: '16px',
        md: '24px',
        lg: '40px',
        xl: '64px',
        'margin-mobile': '20px',
        'max-width': '1200px',
      },
      fontFamily: {
        sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        manrope: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        h1: ['Manrope', 'sans-serif'],
        h2: ['Manrope', 'sans-serif'],
        h3: ['Manrope', 'sans-serif'],
        'body-lg': ['Manrope', 'sans-serif'],
        'body-md': ['Manrope', 'sans-serif'],
        'label-md': ['Manrope', 'sans-serif'],
        button: ['Manrope', 'sans-serif'],
      },
      fontSize: {
        h1: ['40px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '800' }],
        h2: ['32px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '700' }],
        h3: ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '1.2', letterSpacing: '0.01em', fontWeight: '600' }],
        button: ['16px', { lineHeight: '1', fontWeight: '600' }],
      },
      boxShadow: {
        'level-1': '0 2px 10px -2px rgba(14, 116, 144, 0.05)',
        'level-2': '0 4px 20px -4px rgba(14, 116, 144, 0.08)',
        'card-hover': '0 8px 30px -4px rgba(14, 116, 144, 0.12)',
      },
    },
  },
  plugins: [formsPlugin, containerQueriesPlugin],
};
