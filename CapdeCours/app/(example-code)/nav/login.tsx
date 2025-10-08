import { Button } from '@/components/Button';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

export default function LoginScreen() {
  return (
    <View className="flex-1 justify-center items-center">
      <Text className="m-6 uppercase font-bold text-3xl text-center">This is the login page</Text>
      <Button title="Back to home" onPress={() => router.push('/')} />
    </View>
  );
}
