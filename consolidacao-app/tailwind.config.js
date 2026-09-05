// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        paz: {
          primary: "#122F5C",
          hover: "#0C2245",
          soft: "#E9EFF8",
          background: "#F7F9FC",
          text: "#172033",
          muted: "#667085",
          border: "#E4E7EC",
          success: "#16824A",
          warning: "#C77A12",
          error: "#C93838",
          info: "#007BFF",
          blue: { // Novos tons de azul do seu HTML
            50: '#EBF4FF',
            100: '#DBEAFE',
            200: '#BFDBFE',
            300: '#93C5FD',
            400: '#60A5FA',
            500: '#3B82F6',
            600: '#2563EB',
            700: '#1D4ED8',
            800: '#1E40AF',
            900: '#1E3A8A',
            950: '#172554',
          },
          accent1: "#6A6AF8",
          accent2: "#FF7F50",
        },
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 24, 40, 0.03)",
        float: "0 18px 50px rgba(18, 47, 92, 0.10)",
        card: "0 4px 12px rgba(0, 0, 0, 0.05)",
        sidebar: "0 1px 2px rgba(16, 24, 40, 0.03)",
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
}