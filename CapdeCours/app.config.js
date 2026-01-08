require('dotenv').config();

module.exports = {
  expo: {
    name: 'CapdeCours',
    slug: 'capdecours',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'demoapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#ffffff',
        foregroundImage: './assets/images/icon.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.vck2004.CapDeCours',
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      'expo-font',
      [
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          project: 'capde-cours',
          organization: 'nhom-trum-mobile-cn01',
        },
      ],
      'expo-secure-store',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '145725e0-99a3-48bd-8a8e-e03da7d4cd16',
      },
      apiUrl: process.env.API_URL || 'https://b570db798a0f.ngrok-free.app',
    },
    owner: 'vck2004',
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/145725e0-99a3-48bd-8a8e-e03da7d4cd16',
    },
  },
};
