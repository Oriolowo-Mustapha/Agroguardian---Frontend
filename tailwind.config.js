/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2D5A27", // Forest Green
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F4F1DE", // Off-white
          foreground: "#3D405B",
        },
        accent: {
          DEFAULT: "#E07A5F", // Terracotta
          foreground: "#FFFFFF",
        },
        background: "#FDFCF0",
        foreground: "#3D405B",
      },
    },
  },
  plugins: [],
}
