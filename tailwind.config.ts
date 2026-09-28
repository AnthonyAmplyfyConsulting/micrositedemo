import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#ff5b16',
          dark: '#181818',
          muted: '#747474',
          line: '#e9e7e4',
          cream: '#faf9f6',
        }
      },
      fontFamily: {
        sans: ['var(--sans)'],
        display: ['var(--display)'],
      },
    },
  },
  plugins: [],
}
export default config
