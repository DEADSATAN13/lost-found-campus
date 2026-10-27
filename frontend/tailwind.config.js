/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1F2A24',
        paper: '#F1EFE6',
        moss: {
          DEFAULT: '#3F5F4D',
          dark: '#324C3D',
          light: '#4E755F',
        },
        mustard: {
          DEFAULT: '#B5762A',
          tint: '#F6ECDD',
          dark: '#966122',
        },
        teal: {
          DEFAULT: '#2C7A7B',
          tint: '#E4F1F1',
          dark: '#236162',
        },
        plum: {
          DEFAULT: '#7A5480',
          tint: '#F0E7F2',
          dark: '#634368',
        },
        muted: '#8A8778',
        line: '#D8D3C4',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        notice: '0 2px 8px -2px rgba(31, 42, 36, 0.08), 0 1px 3px -1px rgba(31, 42, 36, 0.05)',
        noticeHover: '0 8px 16px -4px rgba(31, 42, 36, 0.12), 0 2px 6px -2px rgba(31, 42, 36, 0.06)',
      },
    },
  },
  plugins: [],
};
