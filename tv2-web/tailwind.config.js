/**
 * HaUI Advisor — Tailwind CSS config (prototype-v1)
 * Owner: TV2 (Frontend Platform & Academic Engineer)
 *
 * Theme lấy nguyên từ cấu hình Tailwind CDN của bộ prototype
 * (tv3-planner-ui/design/prototype, file code.html của từng màn) để các màn hình React
 * dùng đúng class của prototype. Quét cả tv3-planner-ui/src vì các trang TV3
 * được mount và build bên trong Web Host này.
 */

const GEIST = ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'];

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}', '../tv3-planner-ui/src/**/*.js'],
  theme: {
    extend: {
      colors: {
        background: '#f9f9f9',
        canvas: '#f5f5f5',
        ember: '#e7000b',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        hairline: '#e5e5e5',
        ink: '#0a0a0a',
        'ink-soft': '#171717',
        'inverse-on-surface': '#f1f1f1',
        'inverse-primary': '#c9c6c5',
        'inverse-surface': '#2f3131',
        'mid-gray': '#737373',
        'on-background': '#1a1c1c',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        'on-primary': '#ffffff',
        'on-primary-container': '#858383',
        'on-primary-fixed': '#1c1b1b',
        'on-primary-fixed-variant': '#474646',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#646464',
        'on-secondary-fixed': '#1b1c1c',
        'on-secondary-fixed-variant': '#464747',
        'on-surface': '#1a1c1c',
        'on-surface-variant': '#444748',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#868381',
        'on-tertiary-fixed': '#1d1b1a',
        'on-tertiary-fixed-variant': '#484645',
        outline: '#747878',
        'outline-variant': '#c4c7c7',
        paper: '#ffffff',
        primary: '#000000',
        'primary-container': '#1c1b1b',
        'primary-fixed': '#e5e2e1',
        'primary-fixed-dim': '#c9c6c5',
        secondary: '#5e5e5e',
        'secondary-container': '#e3e2e2',
        'secondary-fixed': '#e3e2e2',
        'secondary-fixed-dim': '#c7c6c6',
        surface: '#f9f9f9',
        'surface-alt': '#fafafa',
        'surface-bright': '#f9f9f9',
        'surface-container': '#eeeeee',
        'surface-container-high': '#e8e8e8',
        'surface-container-highest': '#e2e2e2',
        'surface-container-low': '#f3f3f3',
        'surface-container-lowest': '#ffffff',
        'surface-dim': '#dadada',
        'surface-tint': '#5f5e5e',
        'surface-variant': '#e2e2e2',
        tertiary: '#000000',
        'tertiary-container': '#1d1b1a',
        'tertiary-fixed': '#e6e1df',
        'tertiary-fixed-dim': '#cac6c3'
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px'
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.25rem',
        'space-xl': '2rem',
        margin: '1rem',
        'margin-tablet': '1.5rem',
        'margin-desktop': '2.5rem',
        gutter: '1rem',
        'gutter-desktop': '1.5rem'
      },
      fontFamily: {
        body: GEIST,
        'body-medium': GEIST,
        caption: GEIST,
        label: GEIST,
        subheading: GEIST,
        headline: GEIST,
        display: GEIST,
        'display-mobile': GEIST
      },
      fontSize: {
        caption: ['12px', { lineHeight: '16px', fontWeight: '400' }],
        label: ['12px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '500' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-medium': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        subheading: ['18px', { lineHeight: '26px', letterSpacing: '-0.01em', fontWeight: '500' }],
        headline: ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-mobile': ['36px', { lineHeight: '44px', letterSpacing: '-0.025em', fontWeight: '600' }],
        display: ['48px', { lineHeight: '56px', letterSpacing: '-0.03em', fontWeight: '600' }]
      }
    }
  },
  plugins: []
};
