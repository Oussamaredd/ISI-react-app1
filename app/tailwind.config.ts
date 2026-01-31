/** @type {import('tailwindcss').Config} */

const config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          300: "#a5b4fc",
          500: "#5b8cff",
          600: "#3d6eff",
          700: "#2f54d1",
          900: "#0b1220",
        },
        surface: {
          50: "#0b0d10",
          100: "#0f131a",
          200: "#121826",
          300: "#161d2a",
        },
        success: {
          100: "#d1fae5",
          500: "#27d17f",
          600: "#1fb46d",
          700: "#158556",
        },
        warning: {
          100: "#fef3c7",
          500: "#f6c35b",
          600: "#e3a43a",
          700: "#b77c20",
        },
        danger: {
          100: "#fee2e2",
          500: "#ff6b6b",
          600: "#e15252",
          700: "#b93d3d",
        },
      }
    },
  },
  plugins: [],
};

export default config;
