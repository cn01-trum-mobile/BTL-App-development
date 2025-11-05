import { CheckCircle2Icon } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export function Alert({ visible, message, onDismiss }: { visible: boolean; message?: string; onDismiss: () => void }) {
  const opacity = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (!visible) {
      return;
    }
    opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    // timeout
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) }, () => {
        scheduleOnRN(onDismiss);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [visible]);

  return (
    visible && (
      <Animated.View style={animatedStyle} className="absolute inset-0">
        <Pressable onPress={onDismiss} className="flex-1 items-center justify-center">
          <View className="bg-[#714E43] rounded-2xl p-6 text-center max-w-[233px]">
            <View className="mx-auto mb-2 rounded-full flex items-center justify-center">
              <CheckCircle2Icon size={40} color={'white'} strokeWidth={1} />
            </View>
            <Text className="text-white font-sen font-bold text-sm text-center">{message}</Text>
          </View>
        </Pressable>
      </Animated.View>
    )
  );
}
