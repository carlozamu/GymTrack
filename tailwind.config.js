/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#f6f7fb",
        surface: "#ffffff",
        outline: "#e2e8f0",
        accent: {
          DEFAULT: "#2563eb",
          light: "#e5edff",
        },
        success: "#16a34a",
        text: {
          primary: "#0f172a",
          secondary: "#64748b",
        },
      },
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          '"SF Pro Text"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 12px 28px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
