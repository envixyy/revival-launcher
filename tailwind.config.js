module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        revival: {
          dark: 'var(--revival-dark)',
          card: 'var(--revival-card)',
          accent: 'var(--revival-accent)',
          gradEnd: 'var(--revival-grad-end)',
          text: 'var(--revival-text)',
          sidebar: 'var(--revival-sidebar)',
          panel: 'var(--revival-panel)',
        }
      }
    },
  },
  plugins: [],
}
