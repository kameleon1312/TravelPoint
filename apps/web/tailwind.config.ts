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
        'aurora-gradient': 'linear-gradient(135deg, #1FA899, #3DD6C4, #5B8DEF)',
        'cosmic-gradient': 'linear-gradient(180deg, #05060A, #0E1A33, #13294B)',
        'signal-gradient': 'linear-gradient(135deg, #5B8DEF, #3DD6C4)',
        'ember-gradient': 'linear-gradient(135deg, #FF7A59, #9B6DFF)',
      },
    },
  },
  plugins: [],
};

export default config;
