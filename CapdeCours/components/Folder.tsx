import { RelativePathString, router } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Animated, PanResponder } from 'react-native';
import React, { useMemo, useState, useRef, useEffect } from 'react';

interface FolderCardProps {
  title: string;
  link?: RelativePathString; // 1. Link thành optional
  onPress?: () => void;      // 2. Thêm hàm onPress tùy chỉnh
  isActive?: boolean;        // 3. Trạng thái đang chọn (để đổi màu Nâu/Kem)
  icon?: React.ReactNode;    // 4. Icon tùy chỉnh (thay cho Pencil)
  rightIcon?: React.ReactNode; // 5. Icon bên phải (Chevron/Check)
  onEditPress?: () => void;    
  onDeletePress?: () => void;
  showActions?: boolean;
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
  rightIcon,
  onEditPress,     
  onDeletePress,
  showActions = true 
}: FolderCardProps) {
  // Animation cho swipe
  const translateX = useRef(new Animated.Value(0)).current;
  const [isSwiped, setIsSwiped] = useState(false);

  // PanResponder cho swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -80));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          setIsSwiped(true);
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          setIsSwiped(false);
        }
      },
    })
  ).current;

  // Logic màu nền
  const backgroundColor = useMemo(() => {
    if (isActive !== undefined) {
      return isActive ? '#6E4A3F' : '#FFD9B3';
    }
    return getWarmPastelColor();
  }, [isActive]);

  // Logic màu chữ và icon
  const textColor = isActive ? 'text-white' : 'text-[#35383E]';
  const iconBgColor = isActive ? 'bg-white/20' : 'bg-black/10';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (link && !isSwiped) { 
      router.push(link);
    }
  };

  // Hàm xử lý edit
  const handleEdit = (e: any) => {
    e?.stopPropagation?.();
    onEditPress?.();
  };

  const handleDelete = (e: any) => {
    e?.stopPropagation?.();
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start(() => {
      setIsSwiped(false);
      onDeletePress?.();
    });
  };

  // Reset khi props thay đổi
  useEffect(() => {
    if (!title) return;
    translateX.setValue(0);
    setIsSwiped(false);
  }, [title, translateX]);

  return (
    <View className="relative mb-3 overflow-hidden rounded-[22.5px]">
      {/* Nút xóa (nằm bên dưới, hiện khi swipe) */}
      {showActions && onDeletePress && (
        <View className="absolute inset-0 flex-row justify-end">
          {/* Nút xóa */}
          <View className="w-full h-full bg-[#6E4A3F]">
            <TouchableOpacity 
              onPress={handleDelete}
              className="w-full h-full justify-center items-end pr-6"
            >
              <Trash2 size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Card chính có thể swipe */}
      <Animated.View
        style={{
          transform: [{ translateX }],
        }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePress}
          className="relative flex-row items-center gap-4 p-4 rounded-[22.5px] h-[65px]"
          style={{ backgroundColor }}
        >
          {/* Icon bút chì edit */}
          <TouchableOpacity
            onPress={handleEdit}
            className={`flex items-center justify-center w-[35px] h-[35px] rounded-[11.25px] ${iconBgColor}`}
          >
            {icon ? icon : <Pencil size={16} color={isActive ? 'white' : '#35383E'} />}
          </TouchableOpacity>

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
      </Animated.View>
    </View>
  );
}