import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand:   { DEFAULT: '#FAFAF7', text: '#1F160E', accent: '#E8933A' },
        beige:   { DEFAULT: '#D4B896', light: '#EDE0D0', dark: '#B89A78' },
        wood:    { DEFAULT: '#E8933A', light: '#A0845C', dark: '#6B5234' },
        sand:    { DEFAULT: '#FFF5EB', dark: '#E8DDD0' },
      },
      fontFamily: {
        sans: ['var(--font-noto)', 'Hiragino Sans', 'Yu Gothic', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
