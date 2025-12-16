import { useFonts } from 'expo-font';
import { Slot, useNavigationContainerRef } from 'expo-router';
import { StatusBar, View } from 'react-native';
import '@/global.css';
import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomActionProvider } from '@/context/NavActionContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';

const navigationIntegration = Sentry.reactNavigationIntegration();

Sentry.init({
  dsn: 'https://0975f19840063c5eaa0f56ab3bd3f3fb@o4510486426419200.ingest.us.sentry.io/4510486430351360',
  tracePropagationTargets: ['https://myproject.org', /^\/api\//],
  debug: true, // Bật để xem logs khi test

  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% transactions khi test
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 5000,

  // User Interaction Tracking
  enableUserInteractionTracing: true,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function RootLayout() {
  const ref = useNavigationContainerRef();

  useEffect(() => {
    if (ref) {
      navigationIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);
  // Thiết lập user context cho analytics
  useEffect(() => {
    Sentry.setUser({
      id: 'trum-mobile',
      email: 'ky.vucao2004@hcmut.edu.vn',
      username: 'vck',
    });
    Sentry.setTag('group', 'trum-mobile');
  }, []);

  useEffect(() => {
    NavigationBar.setVisibilityAsync('hidden');
  }, []);

  let [fontsLoaded] = useFonts({
    sunshiney: require('@/assets/fonts/Sunshiney-Regular.ttf'),
    sen: require('@/assets/fonts/Sen-VariableFont_wght.ttf'),
    poppins: require('@/assets/fonts/poppins.regular.ttf'),
  });
  if (!fontsLoaded) {
    return <View></View>;
  }
  return (
    <BottomActionProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 bg-[#FFF8E3]">
          <StatusBar hidden={true} />
          {/* <Button
            title="Try!"
            onPress={() => {
              Sentry.captureException(new Error('First error'));
            }}
          /> */}
          <Slot></Slot>
        </SafeAreaView>
      </GestureHandlerRootView>
    </BottomActionProvider>
  );
});
