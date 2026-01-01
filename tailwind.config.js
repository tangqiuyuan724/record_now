
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        mac: {
          bg: '#ffffff',
          sidebar: '#fbfbfb',
          divider: '#e5e5e5',
          text: '#333333',
          accent: '#007aff',
          secondary: '#8e8e93',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Menlo', 'Monaco', 'Courier New', 'monospace'],
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
