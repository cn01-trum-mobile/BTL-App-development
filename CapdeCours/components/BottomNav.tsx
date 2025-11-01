// components/BottomNav.tsx

import { useNavigation, useRoute } from '@react-navigation/native';
import { Clock, Home, Search, User } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export default function BottomNav() {
  const navigation = useNavigation();
  const route = useRoute();

  const currentRoute = route.name;

  const isActive = (name: string) => currentRoute === name;

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-transparent px-3 pb-2 items-center">
      <View className="flex-row justify-center items-end w-full max-w-[393px]">
        {/* Home */}
        <TouchableOpacity onPress={() => navigation.navigate('Home' as never)} activeOpacity={0.8} className="flex-1 items-center gap-1.5">
          <Home size={24} color={isActive('Home') ? '#42160D' : '#676D75'} strokeWidth={isActive('Home') ? 2 : 1.5} />
          <Text className="text-[12px] font-poppins text-[#676D75]">Home</Text>
        </TouchableOpacity>

        {/* Search */}
        <TouchableOpacity onPress={() => navigation.navigate('Search' as never)} activeOpacity={0.8} className="flex-1 items-center gap-1.5">
          <Search size={24} color="#676D75" strokeWidth={1.5} />
          <Text className="text-[12px] font-poppins text-[#676D75]">Search</Text>
        </TouchableOpacity>

        {/* Camera Button */}
        <TouchableOpacity onPress={() => navigation.navigate('Camera' as never)} activeOpacity={0.8} className="flex-1 items-center -mt-2">
          <View className="p-3.5 rounded-full border-4 border-[rgba(66,22,13,0.75)] bg-white">
            {/* You can replace this SVG with a lucide-react-native icon if you like */}
            <Home size={24} color="rgba(66,22,13,0.75)" strokeWidth={2} />
          </View>
        </TouchableOpacity>

        {/* Schedule */}
        <TouchableOpacity onPress={() => navigation.navigate('Schedule' as never)} activeOpacity={0.8} className="flex-1 items-center gap-1.5">
          <Clock size={24} color="#676D75" strokeWidth={1.5} />
          <Text className="text-[12px] font-poppins text-[#676D75]">Schedule</Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)} activeOpacity={0.8} className="flex-1 items-center gap-1.5">
          <User size={24} color="#676D75" strokeWidth={1.5} />
          <Text className="text-[12px] font-poppins text-[#676D75]">Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
