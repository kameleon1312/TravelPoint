import type { Config } from 'tailwindcss';
import { Colors, Spacing, BorderRadius } from '@travelpoint/theme';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: Colors as unknown as Record<string, string>,
      spacing: Object.fromEntries(
        Object.entries(Spacing).map(([k, v]) => [k, `${v}px`]),
      ),
      borderRadius: Object.fromEntries(
        Object.entries(BorderRadius).map(([k, v]) => [k, `${v}px`]),
      ),
      fontFamily: {
        display: ['Clash Display', 'sans-serif'],
        sans: ['General Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      animation: {
        'signal-pulse': 'signalPulse 2.4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'starfield': 'starfield 60s linear infinite',
      },
      keyframes: {
        signalPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.5)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        starfield: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-50%)' },
        },
      },
      backgroundImage: {
        'aurora-gradient': 'linear-gradient(135deg, #3A8C6A, #5CB88C, #1E9AB0)',
        'cosmic-gradient': 'linear-gradient(180deg, #070A0C, #0F1E2A, #133040)',
        'signal-gradient': 'linear-gradient(135deg, #1E9AB0, #5CB88C)',
        'ember-gradient':  'linear-gradient(135deg, #C86840, #7A6D9E)',
      },
    },
  },
  plugins: [],
};

export default config;
