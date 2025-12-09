import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '@/components/BottomNav';

export default function CalendarSelectScreen({ navigation }: any) {
  // Set mặc định là rỗng
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- PHẦN 1: LOGIC MỚI ĐỂ LOAD VÀ CHECK LỊCH ---
  useEffect(() => {
    (async () => {
      try {
        // 1. Xin quyền trước
        const { status } = await Calendar.requestCalendarPermissionsAsync();

        if (status !== 'granted') {
          Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền đọc lịch để hoạt động.');
          setIsLoading(false);
          return;
        }

        // 2. Chạy song song 2 tác vụ: Lấy danh sách lịch THỰC TẾ & Lấy danh sách ĐÃ LƯU
        // Dùng Promise.all để tiết kiệm thời gian chờ
        const [allCalendars, storedIdsJson] = await Promise.all([
          Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT),
          AsyncStorage.getItem('USER_CALENDAR_IDS'),
        ]);

        console.log(JSON.stringify(allCalendars, null, 2));

        // 3. Lọc lịch "rác" / hệ thống
        const filteredCalendars = allCalendars.filter((cal) => {
          // Logic lọc: Bỏ lịch sinh nhật tự động, bỏ lịch Holidays (nếu muốn)
          // cal.source.type === 'LOCAL' thường là lịch trong máy không đồng bộ cloud
          const isGoogleAccount = cal.source.type === 'com.google';

          const isAndroid = isGoogleAccount && cal.isPrimary;

          const isIOS = cal.source?.type?.toLowerCase() === 'caldav' && cal.source?.name?.toLowerCase().includes('gmail') && cal.allowsModifications === true;
          return isAndroid || isIOS;
        });

        // 4. Khôi phục trạng thái đã chọn (Re-hydrate)
        let newSelectedIds = new Set<string>();

        if (storedIdsJson) {
          const storedIdsArr = JSON.parse(storedIdsJson);

          // Chỉ chọn những ID nào thực sự còn tồn tại trong danh sách lịch mới lấy về
          // (Đề phòng trường hợp user đã xóa lịch đó trong cài đặt điện thoại)
          storedIdsArr.forEach((id: string) => {
            const exists = filteredCalendars.find((c) => c.id === id);
            if (exists) {
              newSelectedIds.add(id);
            }
          });
        }

        // 5. Cập nhật State
        setCalendars(filteredCalendars);
        setSelectedIds(newSelectedIds);
      } catch (error) {
        console.log(error);
        Alert.alert('Lỗi', 'Không thể tải danh sách lịch');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);
  // ------------------------------------------------

  // Xử lý chọn/bỏ chọn
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  // Xử lý lưu
  const handleContinue = async () => {
    if (selectedIds.size === 0) return;

    setIsSaving(true);
    try {
      const idsArray = Array.from(selectedIds);
      await AsyncStorage.setItem('USER_CALENDAR_IDS', JSON.stringify(idsArray));
      Alert.alert('Thành công', `Đã cập nhật ${idsArray.length} nguồn lịch.`);
      // navigation.navigate('Home'); // Ví dụ chuyển trang
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu dữ liệu');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FFF8E3] flex-col items-center pt-2 px-5">
      {/* Title */}
      <View className="w-full justify-center pb-4 border-b border-gray-100">
        <Text className="font-sunshiney text-[24px] font-semibold text-[#32343E] opacity-80 text-center">CapdeCours</Text>
      </View>

      {/* Header */}
      <View className="mt-8 mb-6 items-center px-4">
        <Text className="text-[24px] font-sen font-bold text-[#AC3C00] text-center mb-2">Add your schedule</Text>
        <Text className="text-[14px] font-sen text-[#646982] text-center leading-5">Choose the sources you want to connect.</Text>
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 justify-center">
          <ActivityIndicator size="large" color="#AC3C00" />
        </View>
      ) : (
        <ScrollView className="w-full flex-1 mb-6" showsVerticalScrollIndicator={false}>
          {calendars.length === 0 ? (
            <Text className="text-center mt-10 text-gray-500">There is no available schedule.</Text>
          ) : (
            calendars.map((cal) => {
              const isSelected = selectedIds.has(cal.id);
              return (
                <TouchableOpacity
                  key={cal.id}
                  onPress={() => toggleSelection(cal.id)}
                  activeOpacity={0.7}
                  className={`flex-row items-center p-4 mb-3 rounded-2xl border ${
                    !isSelected ? 'bg-[#FFF5F0] border-[#AC3C00]' : 'bg-primary border-gray-100'
                  }`}
                >
                  <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${!isSelected ? 'bg-primary' : 'bg-gray-100'}`}>
                    <Ionicons name={!isSelected ? 'calendar' : 'calendar-outline'} size={20} color={!isSelected ? 'white' : '#646982'} />
                  </View>

                  <View className="flex-1">
                    <Text className={`font-sen text-[14px] font-bold ${!isSelected ? 'text-primary' : 'text-[#ffffff]'}`}>{cal.title}</Text>
                    <Text className={`font-sen text-[12px] font-bold ${!isSelected ? 'text-[#646982]' : 'text-[#ffefe6ff]'}`}>{cal.source.name}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color="white" />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Button */}
      <View className="w-full items-center mb-8 bg-[#FFF8E3] pt-2">
        <TouchableOpacity
          className={`h-[50px] w-[200px] rounded-xl items-center justify-center flex-row shadow-sm ${selectedIds.size > 0 ? 'bg-[#AC3C00]' : 'bg-gray-300'}`}
          onPress={handleContinue}
          disabled={selectedIds.size === 0 || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white font-sen text-[14px] font-bold uppercase tracking-widest">CONTINUE ({selectedIds.size})</Text>
          )}
        </TouchableOpacity>
      </View>
      <BottomNav />
    </View>
  );
}
