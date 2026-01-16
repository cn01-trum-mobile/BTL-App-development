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
      package: 'com.lethanhbaotran.CapDeCours',
      permissions: ['INTERNET'],
      usesCleartextTraffic: true,
      targetSdkVersion: 27,
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
        projectId: 'ef10f305-4565-4542-b05c-f1c575b74917',
      },
      apiUrl: process.env.API_URL || 'https://capdecours.tuanemtramtinh.io.vn',
    },
    owner: 'lethanhbaotran',
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/ef10f305-4565-4542-b05c-f1c575b74917',
    },
  },
};
