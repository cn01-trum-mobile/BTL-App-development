import { addYears } from 'date-fns';
import * as Calendar from 'expo-calendar';
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Button, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CalendarSetup() {
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Thêm biến này để chứa kết quả hiển thị ra màn hình
  const [previewEvents, setPreviewEvents] = useState<Calendar.Event[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const allCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        // Lọc bỏ bớt mấy cái lịch hệ thống không cần thiết nếu muốn
        setCalendars(allCalendars);
      }
    })();
  }, []);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) newSelection.delete(id);
    else newSelection.add(id);
    setSelectedIds(newSelection);
  };

  const handleNext = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('Chưa chọn lịch', 'Vui lòng chọn ít nhất 1 nguồn lịch.');
      return;
    }

    setIsLoading(true);
    setPreviewEvents([]); // Reset list cũ

    try {
      const idsArray = Array.from(selectedIds);

      // 1. Lưu ID lại (giả lập)
      await AsyncStorage.setItem('USER_CALENDAR_IDS', JSON.stringify(idsArray));

      // 2. Lấy sự kiện: Từ hôm nay đến 1 tháng tới (Test thử 1 tháng cho nhanh)
      const startDate = new Date();
      const endDate = addYears(startDate, 1);

      const events = await Calendar.getEventsAsync(idsArray, startDate, endDate);

      // Sắp xếp sự kiện theo thời gian tăng dần
      events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      // Cập nhật vào state để hiển thị ra màn hình
      setPreviewEvents(events);

      if (events.length === 0) {
        Alert.alert('Thông báo', 'Không tìm thấy sự kiện nào trong các lịch đã chọn.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lấy dữ liệu lịch.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-xl font-bold mb-2 mt-10">Bước 1: Chọn nguồn dữ liệu</Text>

      {/* Danh sách Lịch để chọn */}
      <View className="mb-4">
        {calendars.map((cal) => {
          const isSelected = selectedIds.has(cal.id);
          return (
            <TouchableOpacity
              key={cal.id}
              onPress={() => toggleSelection(cal.id)}
              className={`p-3 mb-2 rounded border flex-row justify-between items-center ${isSelected ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200'}`}
            >
              <View style={{ flex: 1 }}>
                <Text className={`font-bold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>{cal.title}</Text>
                <Text className="text-xs text-gray-500">{cal.source.name}</Text>
              </View>
              {isSelected && <Text className="text-blue-600 text-lg font-bold">✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <Button title={isLoading ? 'Đang tải...' : 'Xem trước sự kiện (Next)'} onPress={handleNext} disabled={isLoading} />

      {/* Khu vực hiển thị kết quả sau khi bấm Next */}
      <View className="mt-8 mb-10">
        <Text className="text-xl font-bold mb-4">Kết quả ({previewEvents.length} sự kiện):</Text>

        {isLoading && <ActivityIndicator size="large" color="blue" />}

        {previewEvents.map((event, index) => (
          <View key={index} className="p-3 mb-3 bg-gray-100 rounded border-l-4 border-blue-500">
            <Text className="font-bold text-base">{event.title}</Text>
            <Text className="text-gray-600">
              {new Date(event.startDate).toLocaleDateString('vi-VN')}
              {' lúc '}
              {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {event.location && <Text className="text-blue-600 italic text-sm mt-1">📍 {event.location}</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
