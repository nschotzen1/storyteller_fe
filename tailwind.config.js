module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Space Mono"', "monospace"],
        fell: ['"IM Fell English"', 'serif'],
        cinzel: ['"Cinzel Decorative"', 'cursive'],
      },
      
      
      // animation: {
      //   cardFadeIn: 'cardFadeIn 5s ease-out',
      // },
      // keyframes: {
      //   cardFadeIn: {
      //     '0%': { opacity: 0, transform: 'scale(0.96)' },
      //     '100%': { opacity: 1, transform: 'scale(1)' },
      //   },
      // },
    },
  },
  plugins: [],
};
