/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#060814",
        surface: {
          50: "#0e1329",
          100: "#131b38",
          200: "#182247",
          300: "#222f5c",
        },
        brand: {
          cyan: "#00f0ff",
          purple: "#8b5cf6",
          violet: "#6366f1",
          pink: "#ec4899",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "cyber-mesh": "radial-gradient(at 20% 20%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(0, 240, 255, 0.12) 0px, transparent 50%)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(0, 240, 255, 0.3)" },
          "100%": { boxShadow: "0 0 30px rgba(139, 92, 246, 0.5)" },
        },
      },
    },
  },
  plugins: [],
};
