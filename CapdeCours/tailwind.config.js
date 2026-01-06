/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: 'rgba(66,22,13,0.75)',
        orange: '#AC3C00',
      },
      fontFamily: {
        sunshiney: ['sunshiney'],
        sen: ['sen'],
        poppins: ['poppins'],
        'poppins-medium': ['Poppins-Medium'],
        'poppins-semibold': ['Poppins-SemiBold'],
        'poppins-bold': ['Poppins-Bold'],
      },
    },
  },
  plugins: [],
};
