import type { Config } from 'tailwindcss'

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans"],
      },
    }
  },
  plugins: []
} satisfies Config
