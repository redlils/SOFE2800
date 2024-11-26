/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        "event-bg": "#333333",
        "calendar-border": "#999",
        "calendar-day": "#1E1E1E",
        "calendar-top": "#2A2A2A",
        "calendar-text": "#FFFFFF",
        "overflow-event-text": "#AAAAAA"
      }
    },
  },
  plugins: [],
}

