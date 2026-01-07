import { storeData } from '@/utils/asyncStorage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const screenWidth = Dimensions.get('window').width;

interface OnboardingScreen {
  title: string;
  description: string;
  image: any;
}

const screens: OnboardingScreen[] = [
  {
    title: 'In-App Camera',
    description: "Use our dedicated camera. Photos are saved directly to our system, keeping them separate from your phone's personal photo gallery.",
    image: require('@/assets/images/onboard1.png'),
  },
  {
    title: 'Sync Timetable',
    description: 'Connect with your Google Calendar. This allows the app to recognize the subject and automatically organize your photos.',
    image: require('@/assets/images/onboard2.png'),
  },
  {
    title: 'Automatic Sorting',
    description: 'Thanks to your synced timetable, every photo is automatically tagged by Subject and Lecture. Just snap and forget about manual sorting!',
    image: require('@/assets/images/onboard3.png'),
  },
  {
    title: 'Gallery & Search',
    description: 'Access a dedicated library where everything is neatly sorted. Easily search and review material by subject, preparing you for any exam.',
    image: require('@/assets/images/onboard4.png'),
  },
];

export default function Onboarding() {
  const screenOffset = (screenWidth * (screens.length - 1)) / 2;
  const [currentScreen, setCurrentScreen] = useState(0);
  const translateX = useSharedValue(screenOffset + currentScreen * screenWidth);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const handleNext = () => {
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
      translateX.value = withTiming(screenOffset - (currentScreen + 1) * screenWidth, { duration: 200 });
    } else {
      storeData('onboarded', '1');
      router.replace('/home');
    }
  };
  const handlePrev = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
      translateX.value = withTiming(screenOffset - (currentScreen - 1) * screenWidth, { duration: 200 });
    }
  };

  const handleSkip = () => {
    storeData('onboarded', '1');
    router.replace('/home');
  };

  const swipeGesture = Gesture.Pan().onEnd((event) => {
    const { translationX } = event;
    if (translationX < -80) {
      scheduleOnRN(handleNext);
    } else if (translationX > 80) {
      scheduleOnRN(handlePrev);
    }
  });
  const dragGesture = Gesture.Pan()
    .onChange((event) => {
      if (translateX.value + event.changeX > screenOffset - (screens.length - 1) * screenWidth && translateX.value + event.changeX < screenOffset)
        translateX.value += event.changeX;
    })
    .onEnd(() => {
      const defaultX = screenOffset - currentScreen * screenWidth;
      if (translateX.value !== defaultX) translateX.value = withTiming(defaultX, { duration: 200 });
    });

  return (
    <GestureDetector gesture={Gesture.Simultaneous(swipeGesture, dragGesture)}>
      <View className="flex-1 flex-col items-center justify-center pt-2 px-5">
        {/* App Title */}
        <View className="w-full justify-center">
          <Text className="font-sunshiney text-[24px] font-semibold text-[#32343E] opacity-80 text-center">CapdeCours</Text>
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.8} className="absolute right-0">
            <Text className="text-[16px] font-poppins-regular text-[#646982] text-center mt-1">Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Screen */}
        <Animated.View className="flex-1 flex-row" style={[{ width: screenWidth * screens.length }, animatedStyle]}>
          {screens.map((val, idx) => {
            return (
              <View className="flex-1 items-center justify-center px-6" key={idx} style={{ width: screenWidth }}>
                <Image source={val.image} resizeMode="contain" className="w-[316px] h-[316px]" />
                <Text className="text-[24px] font-poppins-regular font-bold text-[#AC3C00] text-center mb-4">{val.title}</Text>

                <Text className="text-[16px] font-poppins-regular text-[#646982] text-center leading-6 mb-12 px-1">{val.description}</Text>
              </View>
            );
          })}
        </Animated.View>

        {/* Bottom Section */}
        <View className="flex-row justify-between items-center w-full">
          {/* Buttons */}
          {currentScreen === 0 ? (
            <View className={'h-[45.5px] w-[73px] px-5 rounded-xl items-center justify-center mb-4 opacity-0'}></View>
          ) : (
            <TouchableOpacity onPress={handlePrev} activeOpacity={0.9} className={'h-[45.5px] w-[73px] rounded-xl bg-primary items-center justify-center mb-4'}>
              <Text className="text-white font-poppins-regular text-[14px] font-bold uppercase opacity-80">Prev</Text>
            </TouchableOpacity>
          )}

          {/* Dots */}
          <View className="flex-row justify-center gap-[11px] mb-4">
            {screens.map((_, index) => (
              <View key={index} className={`w-[10px] h-[10px] rounded-full ${index === currentScreen ? 'bg-[#A44063]' : 'bg-[#4A4459]'}`} />
            ))}
          </View>

          {/* Buttons */}
          <TouchableOpacity onPress={handleNext} activeOpacity={0.9} className="h-[45.5px] w-[73px] rounded-xl bg-primary items-center justify-center mb-4">
            <Text className="text-white font-poppins-regular text-[14px] font-bold uppercase opacity-80">
              {currentScreen === screens.length - 1 ? 'Start' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureDetector>
  );
}
