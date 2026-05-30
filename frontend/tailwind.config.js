/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bg: "#09090B",
        surface: "#18181B",
        surfaceHover: "#27272A",
        border: "#27272A",
        dim: "#A1A1AA",
        primary: "#007AFF",
        ai: "#00F0FF",
        pos: "#22C55E",
        neg: "#FF3B30",
        warn: "#FFCC00",
      },
      fontFamily: {
        head: ["Outfit", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
