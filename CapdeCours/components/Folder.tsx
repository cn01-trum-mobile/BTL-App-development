import { RelativePathString, router } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import React, { useMemo } from 'react';

interface FolderCardProps {
  title: string;
  link?: RelativePathString; // 1. Link thành optional
  onPress?: () => void;      // 2. Thêm hàm onPress tùy chỉnh
  isActive?: boolean;        // 3. Trạng thái đang chọn (để đổi màu Nâu/Kem)
  icon?: React.ReactNode;    // 4. Icon tùy chỉnh (thay cho Pencil)
  rightIcon?: React.ReactNode; // 5. Icon bên phải (Chevron/Check)
}

function randomInRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getWarmPastelColor() {
  const r = randomInRange(255, 255);
  const g = randomInRange(190, 230);
  const b = randomInRange(180, 210);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function FolderCard({ 
  title, 
  link, 
  onPress, 
  isActive, 
  icon, 
  rightIcon 
}: FolderCardProps) {

  // Logic màu nền:
  // - Nếu có prop isActive (chế độ chọn): True -> Nâu đậm, False -> Kem
  // - Nếu không có isActive (chế độ gallery): Random màu
  const backgroundColor = useMemo(() => {
    if (isActive !== undefined) {
      return isActive ? '#6E4A3F' : '#FFD9B3';
    }
    return getWarmPastelColor();
  }, [isActive]);

  // Logic màu chữ và icon:
  // Nếu đang active -> Trắng, ngược lại -> Nâu đậm (hoặc xám đen mặc định)
  const textColor = isActive ? 'text-white' : 'text-[#35383E]';
  const iconBgColor = isActive ? 'bg-white/20' : 'bg-black/10'; // Hoặc bg-white/50 cho state unselected như bạn muốn

  const handlePress = () => {
    if (onPress) {
      onPress(); // Ưu tiên gọi hàm custom
    } else if (link) {
      router.push(link); // Mặc định chuyển trang (dùng push tốt hơn replace cho stack)
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      className="relative flex-row items-center gap-4 p-4 rounded-[22.5px] h-[65px] mb-3"
      style={{ backgroundColor }}
    >
      {/* Icon bên trái */}
      <View className={`flex items-center justify-center w-[35px] h-[35px] rounded-[11.25px] ${iconBgColor}`}>
        {icon ? icon : <Pencil size={16} color={isActive ? 'white' : '#35383E'} />}
      </View>

      {/* Title */}
      <Text className={`flex-1 font-sen font-bold text-sm uppercase ${textColor}`}>
        {title}
      </Text>

      {/* Icon bên phải (nếu có) */}
      {rightIcon && (
        <View className="ml-auto">
            {rightIcon}
        </View>
      )}
    </TouchableOpacity>
  );
}