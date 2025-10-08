import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';

export default function RootLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="login" options={{ title: 'Login', tabBarIcon: () => <AntDesign name="login" size={24} color="black" /> }} />
      <Tabs.Screen
        name="signup"
        options={{ title: 'Signup', tabBarIcon: () => <MaterialCommunityIcons name="account-box-plus-outline" size={24} color="black" /> }}
      />
      <Tabs.Screen name="reset-password" options={{ title: 'Reset Password', tabBarIcon: () => <MaterialIcons name="password" size={24} color="black" /> }} />
    </Tabs>
  );
}
