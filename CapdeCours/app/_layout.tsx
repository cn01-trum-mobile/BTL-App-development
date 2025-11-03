import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { StatusBar, View } from 'react-native';
import '@/global.css';
import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
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
    <SafeAreaView className="flex-1 bg-[#FFF8E3]">
      <StatusBar hidden={true} />
      <Slot></Slot>
    </SafeAreaView>
  );
}
