import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { getData } from '@/utils/asyncStorage';
import { router } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export default function Home() {
  const scale = useSharedValue(0.05);
  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const opacity2 = useSharedValue(0);
  const animatedStyle2 = useAnimatedStyle(() => ({
    opacity: opacity2.value,
  }));
  const [zoom, setZoom] = useState(true);
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 150 });
    setTimeout(() => {
      scale.value = withTiming(2, { duration: 700, easing: Easing.in(Easing.ease) });
    }, 150);
    setTimeout(() => {
      setZoom(false);
      setShowLogo(true);
    }, 950);
    setTimeout(() => {
      opacity2.value = withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) });
    }, 1750);
    setTimeout(() => {
      checkFirstTimeOpen();
    }, 3750);
  }, []);

  const checkFirstTimeOpen = useCallback(async () => {
    let onboarded = await getData('onboarded');
    if (onboarded !== '1') {
      router.replace('/onboarding');
    } else {
      router.replace('/camera');
    }
  }, []);

  return (
    <View className="flex-1">
      {zoom && (
        <View className="flex-1 bg-[#8D7162] scale-150 justify-center">
          <Animated.View className="bg-[#FFF8E3] rounded-full aspect-square" style={animatedStyle}></Animated.View>
        </View>
      )}
      {showLogo && (
        <Animated.View className="flex-1 justify-center items-center" style={animatedStyle2}>
          <Image source={require('@/assets/images/logo.png')} />
          <Text className="font-sunshiney text-[38px] font-semibold text-[#32343E] opacity-80 text-center mb-2">CapdeCours</Text>
          <Text className="font-sen text-[16px] text-[#AC3C00] opacity-80 text-center mb-5">Snap Fast. Save Smart. Find Easy.</Text>
        </Animated.View>
      )}
    </View>
  );
}
