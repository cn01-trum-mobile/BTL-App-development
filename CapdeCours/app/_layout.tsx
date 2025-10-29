// import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import '../global.css';

export default function RootLayout() {
  let [fontsLoaded] = useFonts({
    sunshiney: require('../assets/fonts/Sunshiney-Regular.ttf'),
  });

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="(example-code)/nav" options={{ title: 'Nav', headerShown: false }} />
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
    </Stack>
    // <Stack>
    //   <Stack.Screen name="index" options={{ title: 'Home' }} />
    //   <Stack.Screen name="(example-code)/nav" options={{ title: 'Nav' }} />
    //   <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
    // </Stack>
  );
}
