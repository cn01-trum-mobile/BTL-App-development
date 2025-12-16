/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'primary-brown': '#6E4A3F',
        'secondary-beige': '#FFF8E3',
        'gray-button': '#676D75',
        'primary-orange': '#AC3C00',
        'primary-pink': '#A44063',
        'primary-beige': '#FFE8BB',
        'secondary-light-beige': '#FEF5F0',
        'primary-black': '#000',
        'secondary-black': '#32343E',
        'primary-gray': '#595C65',
        'secondary-light-brown': '#8D7162',
        'secondary-pink': '#FFCFBB',
        'secondary-orange': '#FFDBBB',
        'secondary-gray': '#C0C0C0',
        'primary-white': '#fff',
        'secondary-violet': '#CFCAE4',
      },
      fontFamily: {
        sunshiney: ['sunshiney'],
        poppins: ['poppins'],
      },
    },
  },
  plugins: [],
};
