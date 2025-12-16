import { useBottomAction } from '@/context/NavActionContext';
import { router, usePathname } from 'expo-router';
import { Clock, Home, Image, User } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

export default function BottomNav() {
  const currentRoute = usePathname();
  const isActive = (name: string) => currentRoute === name;
  const { action, disabled } = useBottomAction();

  return (
    <View className="bottom-0 left-0 right-0 bg-secondary-beige pb-2 pt-4 items-center">
      <View className="flex-row justify-center items-end w-full">
        {/* Home */}
        <TouchableOpacity
          onPress={() => {
            router.replace('/home');
          }}
          activeOpacity={0.8}
          className="flex-1 items-center gap-1.5"
        >
          <Home size={24} color={isActive('/home') ? '#A44063' : '#676D75'} strokeWidth={isActive('/') ? 2 : 1.5} />
          <Text className={`${isActive('/home') ? 'text-primary-pink' : 'text-gray-button'} text-[12px] font-poppins`}>Home</Text>
        </TouchableOpacity>

        {/* Gallery */}
        <TouchableOpacity
          onPress={() => {
            router.replace('/gallery');
          }}
          activeOpacity={0.8}
          className="flex-1 items-center gap-1.5"
        >
          <Image size={24} color={isActive('/gallery') || isActive('/sessionFolders') ? '#A44063' : '#676D75'} strokeWidth={isActive('') ? 2 : 1.5} />
          <Text className={`${isActive('/gallery') || isActive('/sessionFolders') ? 'text-primary-pink' : 'text-gray-button'} text-[12px] font-poppins`}>
            Gallery
          </Text>
        </TouchableOpacity>

        {/* Camera Button */}
        <TouchableOpacity disabled={disabled} onPress={action.onPress} activeOpacity={0.8} className="flex-1 items-center -mt-2">
          <View
            className={`p-3.5 rounded-full border-4 ${isActive('/camera/imagePreview') ? 'bg-primary-brown border-[rgba(0,0,0,0)]' : 'bg-white border-primary-brown'}`}
          >
            {action.icon}
          </View>
        </TouchableOpacity>

        {/* Schedule */}
        <TouchableOpacity
          onPress={() => {
            router.replace('/onboarding');
          }}
          activeOpacity={0.8}
          className="flex-1 items-center gap-1.5"
        >
          <Clock size={24} color={isActive('') ? '#A44063' : '#676D75'} strokeWidth={isActive('') ? 2 : 1.5} />
          <Text className={`${isActive('') ? 'text-primary-pink' : 'text-gray-button'} text-[12px] font-poppins`}>Schedule</Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          onPress={() => {
            router.replace('/login');
          }}
          activeOpacity={0.8}
          className="flex-1 items-center gap-1.5"
        >
          <User color={isActive('') ? '#A44063' : '#676D75'} strokeWidth={isActive('') ? 2 : 1.5} />
          <Text className={`${isActive('') ? 'text-primary-pink' : 'text-gray-button'} text-[12px] font-poppins`}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
