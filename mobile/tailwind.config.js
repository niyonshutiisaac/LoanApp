/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0F766E",
          50: "#F0FDFA",
          100: "#CCFBF1",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
        },
        danger: { DEFAULT: "#DC2626", 50: "#FEF2F2", 100: "#FEE2E2" },
        warning: { DEFAULT: "#D97706", 50: "#FFFBEB", 100: "#FEF3C7" },
        success: { DEFAULT: "#16A34A", 50: "#F0FDF4", 100: "#DCFCE7" },
        info: { DEFAULT: "#2563EB", 50: "#EFF6FF", 100: "#DBEAFE" },
        ink: {
          DEFAULT: "#0F172A",
          soft: "#475569",
          muted: "#94A3B8",
          faint: "#CBD5E1",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};