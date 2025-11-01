// app/Onboarding.tsx or src/screens/Onboarding.tsx

import { storeData } from '@/utils/asyncStorage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

interface OnboardingScreen {
  title: string;
  description: string;
  image: any;
}

const screens: OnboardingScreen[] = [
  {
    title: 'In-App Camera',
    description: "Use our dedicated camera. Photos are saved directly to our system, keeping them separate from your phone's personal photo gallery.",
    image: require('../../assets/images/onboard1.png'),
  },
  {
    title: 'Sync Timetable',
    description: 'Connect with your Google Calendar. This allows the app to recognize the subject and automatically organize your photos.',
    image: require('../../assets/images/onboard2.png'),
  },
  {
    title: 'Automatic Sorting',
    description: 'Thanks to your synced timetable, every photo is automatically tagged by Subject and Lecture. Just snap and forget about manual sorting!',
    image: require('../../assets/images/onboard3.png'),
  },
  {
    title: 'Gallery & Search',
    description: 'Access a dedicated library where everything is neatly sorted. Easily search and review material by subject, preparing you for any exam.',
    image: require('../../assets/images/onboard4.png'),
  },
];

export default function Onboarding() {
  const [currentScreen, setCurrentScreen] = useState(0);

  const handleNext = async () => {
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      storeData('onboarded', '1');
      router.replace('/');
    }
  };

  const handleSkip = async () => {
    storeData('onboarded', '1');
    router.replace('/');
  };

  const screen = screens[currentScreen];

  return (
    <View className="flex-1 bg-[#FFF8E3] items-center justify-center p-4">
      <View className="w-full max-w-[375px] h-[812px] relative flex-col items-center">
        {/* App Title */}
        <Text className="font-sunshiney text-[24px] font-semibold text-[#32343E] opacity-80 text-center mt-12 mb-8">CapdeCours</Text>

        {/* Image */}
        <View className="flex-1 items-center justify-center px-6">
          <Image source={screen.image} resizeMode="contain" className="w-[316px] h-[316px]" />
        </View>

        {/* Bottom Text Section */}
        <View className="w-full px-6 pb-20">
          <Text className="text-[24px] font-sen font-bold text-[#AC3C00] text-center mb-4">{screen.title}</Text>

          <Text className="text-[16px] font-sen text-[#646982] text-center leading-6 mb-12 px-1">{screen.description}</Text>

          {/* Dots */}
          <View className="flex-row justify-center gap-[11px] mb-9">
            {screens.map((_, index) => (
              <View key={index} className={`w-[10px] h-[10px] rounded-full ${index === currentScreen ? 'bg-[#A44063]' : 'bg-[#4A4459]'}`} />
            ))}
          </View>

          {/* Buttons */}
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.9}
            className="w-full h-[62px] rounded-xl bg-[rgba(66,22,13,0.75)] items-center justify-center mb-4"
          >
            <Text className="text-white font-sen text-[14px] font-bold uppercase opacity-80">{currentScreen === screens.length - 1 ? 'Start' : 'Next'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} activeOpacity={0.8}>
            <Text className="text-[16px] font-sen text-[#646982] text-center">Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
