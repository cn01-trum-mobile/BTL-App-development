import { useBottomAction } from '@/context/NavActionContext';
import { router, usePathname } from 'expo-router';
import { Clock, Home, Image, User } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export default function BottomNav() {
  const currentRoute = usePathname();
  const isActive = (name: string) => currentRoute === name;
  const { action } = useBottomAction();

  return (
    <View className="bottom-0 left-0 right-0 bg-[#FFF8E3] px-3 pb-2 pt-4 items-center">
      <View className="flex-row justify-center items-end w-full max-w-[393px]">
        {/* Home */}
        <TouchableOpacity
          onPress={() => {
            router.replace('/');
          }}
          activeOpacity={0.8}
          className="flex-1 items-center gap-1.5"
        >
          <Home size={24} color={isActive('/') ? '#A44063' : '#676D75'} strokeWidth={isActive('/') ? 2 : 1.5} />
          <Text className="text-[12px] font-poppins text-[#676D75]">Home</Text>
        </TouchableOpacity>

        {/* Search */}
        <TouchableOpacity
          onPress={() => {
            router.push('/onboarding');
          }}
          activeOpacity={0.8}
          className="flex-1 items-center gap-1.5"
        >
          <Image size={24} color={isActive('') ? '#A44063' : '#676D75'} strokeWidth={isActive('') ? 2 : 1.5} />
          <Text className="text-[12px] font-poppins text-[#676D75]">Gallery</Text>
        </TouchableOpacity>

        {/* Camera Button */}
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.8} className="flex-1 items-center -mt-2">
          <View
            className={`p-3.5 rounded-full border-4 ${isActive('/camera/imagePreview') ? 'bg-primary border-[rgba(66,22,13,0)]' : 'bg-white border-primary'}`}
          >
            {action.icon}
          </View>
        </TouchableOpacity>

        {/* Schedule */}
        <TouchableOpacity onPress={() => {}} activeOpacity={0.8} className="flex-1 items-center gap-1.5">
          <Clock size={24} color={isActive('') ? '#A44063' : '#676D75'} strokeWidth={isActive('') ? 2 : 1.5} />
          <Text className="text-[12px] font-poppins text-[#676D75]">Schedule</Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity onPress={() => {}} activeOpacity={0.8} className="flex-1 items-center gap-1.5">
          <User color={isActive('') ? '#A44063' : '#676D75'} strokeWidth={isActive('') ? 2 : 1.5} />
          <Text className="text-[12px] font-poppins text-[#676D75]">Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
