/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Source Sans 3"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        kijani: { 50: "#ECF6F5", 100: "#D3EAE8", 200: "#A5D3CF", 500: "#1D7A74", 600: "#146560", 700: "#0E4D4A", 800: "#0A3836", 900: "#06241F" },
        jua: { 100: "#FDF0CC", 400: "#F7BC2B", 500: "#F2A900", 600: "#CC8C00" },
        paper: "#F4F7F6",
        ink: "#172326",
      },
    },
  },
  plugins: [],
};
