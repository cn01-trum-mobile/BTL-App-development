import BottomNav from '@/components/BottomNav';
import { getData } from '@/utils/asyncStorage';
import { router } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function Home() {
  useEffect(() => {
    checkFirstTimeOpen();
  }, []);
  const checkFirstTimeOpen = async () => {
    let onboarded = await getData('onboarded');
    if (onboarded !== '1') {
      router.replace('/onboarding');
    }
  };

  const days = [
    { day: 'Mo', date: '7' },
    { day: 'Tu', date: '8' },
    { day: 'We', date: '9', active: true },
    { day: 'Th', date: '10' },
    { day: 'Fri', date: '11' },
    { day: 'Sa', date: '12' },
  ];

  return (
    <View className="flex-1 bg-[#FFF8E3] pb-24 items-center">
      <ScrollView className="w-full max-w-[375px] px-5 pt-12" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text className="font-sunshiney text-[24px] font-semibold text-[#32343E] opacity-80 text-center mb-8">CapdeCours</Text>

        {/* Calendar Icon */}
        <View className="relative mb-8">
          <View className="absolute right-0 -top-10">
            <CalendarPlus size={30} color="rgba(66,22,13,0.75)" strokeWidth={1.5} />
          </View>
        </View>
        {/* Days Bar */}
        <View className="bg-[#FFE5B1] rounded-xl py-2 px-2 mb-8">
          <View>
            <View className="flex-row justify-between items-start mb-2 px-1.5">
              {days.map((item, index) => (
                <View key={index} className="w-9 items-center">
                  <Text className={`text-[12px] font-montserrat font-bold ${item.active ? 'text-white' : 'text-[#3A3C6A]'}`}>{item.day}</Text>
                </View>
              ))}
            </View>

            <View className="h-[62px] relative">
              <View className="absolute inset-0 flex-row justify-between px-1.5">
                {days.map((item, index) => (
                  <View key={index} className={`w-9 h-full rounded-lg items-center justify-center ${item.active ? 'bg-[rgba(66,22,13,0.75)]' : ''}`}>
                    <Text className={`text-[12px] font-montserrat font-bold ${item.active ? 'text-white' : 'text-[#8A8BB1]'}`}>{item.date}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Section */}
        <View className="mb-6">
          <Text className="text-[13.5px] font-sen font-semibold text-[rgba(66,22,13,0.75)] mb-4 tracking-wide">Classify unorganized images now!</Text>

          <View className="flex-row gap-4">
            {[require('../assets/images/sample.png'), require('../assets/images/sample.png')].map((src, i) => (
              <TouchableOpacity key={i} className="rounded-lg overflow-hidden h-[201px] flex-1" activeOpacity={0.8}>
                <Image source={src} className="w-full h-full" resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}
