import { Slot } from 'expo-router';
import { View, Text } from 'react-native';
import BottomNav from '@/components/BottomNav';

export default function MainLayout() {
  return (
    <View className="flex-1 px-5 pt-2">
      {/* Header */}
      <Text className="font-sunshiney text-[24px] font-semibold text-[#32343E] opacity-80 text-center mb-5">CapdeCours</Text>
      <View className="flex-1">
        <Slot></Slot>
      </View>
      <BottomNav />
    </View>
  );
}
