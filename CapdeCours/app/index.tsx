import { Button } from '@/components/Button';
import { getData, removeData } from '@/utils/asyncStorage';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

export default function HomeScreen() {
  useEffect(() => {
    checkFirstTimeOpen();
  }, []);

  const checkFirstTimeOpen = async () => {
    let onboarded = await getData('onboarded');
    if (onboarded !== '1') {
      router.replace('/onboarding');
    }
  };
  return (
    <View className="flex-1 justify-center items-center">
      <Text className="m-6 uppercase font-bold text-3xl text-center">This is the homepage</Text>
      <Button title="View Onboarding Again" onPress={() => router.replace('/onboarding')} />
      <Button title="View Tab layout" onPress={() => router.push('/nav/login')} />
      <Button title="Clear Storage" variant="danger" onPress={() => removeData('onboarded')} />
    </View>
  );
}
