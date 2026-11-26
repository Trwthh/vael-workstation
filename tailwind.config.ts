import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // VAEL monochrome tokens
        bg: {
          0: '#0f0f11',
          1: '#161619',
          2: '#1c1c20',
          3: '#232326',
        },
        fg: {
          0: '#f5f5f7',
          1: '#e0e0e3',
          2: '#c5c5c8',
          3: '#8e8e93',
          4: '#636366',
        },
        accent: {
          DEFAULT: '#8b7cf6',
          hover: '#a39af8',
          muted: 'rgba(139, 124, 246, 0.08)',
          soft: 'rgba(139, 124, 246, 0.10)',
          glow: 'rgba(139, 124, 246, 0.15)',
          solid: '#f2f2f4',
          blue: '#7dd3fc',
          green: '#86efac',
          purple: '#c4b5fd',
          orange: '#fdba74',
          cyan: '#67e8f9',
        },
        status: {
          ok: '#3ecf8e',
          warn: '#e8b34b',
          danger: '#f16d7a',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.04)',
          hover: 'rgba(255, 255, 255, 0.07)',
          active: 'rgba(255, 255, 255, 0.10)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'SF Pro Text', 'Segoe UI Variable', 'Segoe UI', 'Inter',
          'system-ui', 'sans-serif',
        ],
        display: [
          'SF Pro Display', 'Segoe UI Variable', 'Inter', 'system-ui', 'sans-serif',
        ],
        mono: [
          'Cascadia Code', 'Consolas', 'SF Mono', 'JetBrains Mono', 'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],       // 11
        xs:    ['0.75rem',   { lineHeight: '1rem' }],        // 12
        sm:    ['0.8125rem', { lineHeight: '1.25rem' }],     // 13
        base:  ['0.875rem',  { lineHeight: '1.375rem' }],    // 14
        md:    ['0.9375rem', { lineHeight: '1.5rem' }],      // 15
        lg:    ['1.125rem',  { lineHeight: '1.625rem' }],    // 18
        xl:    ['1.375rem',  { lineHeight: '1.75rem' }],     // 22
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.18)',
        pop: '0 8px 32px rgba(0, 0, 0, 0.36)',
        glow: '0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 10px rgba(255, 255, 255, 0.03)',
        ring: '0 0 0 2px rgba(255, 255, 255, 0.15)',
        focus: '0 0 0 1.5px rgba(255, 255, 255, 0.15), 0 0 8px rgba(255, 255, 255, 0.04)',
      },
      transitionDuration: {
        fast: '90ms',
        DEFAULT: '160ms',
        slow: '220ms',
      },
      transitionTimingFunction: {
        vael: 'cubic-bezier(.22, 1, .36, 1)',
      },
      backdropBlur: {
        glass: '20px',
      },
      width: {
        sidebar: '272px',
        'sidebar-collapsed': '56px',
      },
      height: {
        topbar: '56px',
        control: '36px',
      },
    },
  },
  plugins: [],
}

export default config
