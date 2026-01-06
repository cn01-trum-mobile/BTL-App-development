import { useBottomAction } from '@/context/NavActionContext';
import { router, usePathname } from 'expo-router';
import { Clock, Home, Image, User } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

export default function BottomNav() {
  const currentRoute = usePathname();
  const isActive = (name: string) => currentRoute === name;
  const { action, disabled } = useBottomAction();
  const isImagePreview = currentRoute.includes('/camera/imagePreview');

  return (
    <View className="bottom-0 left-0 right-0 bg-[#FFF8E3] pb-2 pt-4 items-center">
      <View className="flex-row justify-center items-end w-full">
        {!isImagePreview && (
          <>
            {/* Home */}
            <TouchableOpacity
              onPress={() => {
                router.replace('/home');
              }}
              activeOpacity={0.8}
              className="flex-1 items-center gap-1.5"
            >
              <Home size={24} color={isActive('/home') ? '#A44063' : '#676D75'} strokeWidth={isActive('/') ? 2 : 1.5} />
              <Text className="text-[12px] font-poppins text-[#676D75]">Home</Text>
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
              <Text className="text-[12px] font-poppins text-[#676D75]">Gallery</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Camera Button */}
        <TouchableOpacity disabled={disabled} onPress={action.onPress} activeOpacity={0.8} className={`${isImagePreview ? 'flex-[3]' : 'flex-1'} items-center ${isImagePreview ? '' : '-mt-2'}`}
        >
          <View
            className={`p-3.5 rounded-full border-4 ${isActive('/camera/imagePreview') ? 'bg-primary border-[rgba(66,22,13,0)]' : 'bg-white border-primary'}`}
          >
            {action.icon}
          </View>
        </TouchableOpacity>

        {!isImagePreview && (
          <>
            {/* Schedule */}
            <TouchableOpacity
              onPress={() => {
                router.replace('/schedule');
              }}
              activeOpacity={0.8}
              className="flex-1 items-center gap-1.5"
            >
              <Clock size={24} color={isActive('') ? '#A44063' : '#676D75'} strokeWidth={isActive('') ? 2 : 1.5} />
              <Text className="text-[12px] font-poppins text-[#676D75]">Schedule</Text>
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
              <Text className="text-[12px] font-poppins text-[#676D75]">Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}