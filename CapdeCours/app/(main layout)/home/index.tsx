import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CalendarPlus } from 'lucide-react-native';
import { addDays, format, isSameDay, startOfWeek, endOfDay, startOfDay, differenceInMinutes } from 'date-fns';
import * as Calendar from 'expo-calendar';
import { useFocusEffect } from '@react-navigation/native'; // Hoặc 'expo-router' nếu bạn dùng expo-router
import { getData } from '@/utils/asyncStorage';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Calendar.Event[]>([]);
  const [loading, setLoading] = useState(false);

  // Tính toán tuần hiển thị dựa trên ngày đang chọn (để khi bấm ngày khác nó không bị nhảy tuần lung tung)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Hàm load sự kiện
  const fetchEvents = async (date: Date) => {
    setLoading(true);
    try {
      // 1. Lấy danh sách lịch đã chọn từ bộ nhớ
      const storedIds = await getData('USER_CALENDAR_IDS');
      if (!storedIds) {
        // Chưa chọn lịch -> Không làm gì hoặc báo user
        setLoading(false);
        return;
      }
      const calendarIds = JSON.parse(storedIds);

      // 2. Xác định thời gian bắt đầu và kết thúc của NGÀY ĐANG CHỌN
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      // 3. Gọi API lấy sự kiện
      const fetchedEvents = await Calendar.getEventsAsync(calendarIds, startDate, endDate);

      // 4. Sắp xếp theo giờ tăng dần
      fetchedEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Lỗi lấy lịch:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tự động load lại khi mở màn hình hoặc đổi ngày
  useFocusEffect(
    useCallback(() => {
      fetchEvents(selectedDate);
    }, [selectedDate])
  );

  return (
    <ScrollView className="flex-1 px-5 bg-[#FFF8E3] pt-10">
      {/* Welcome + Calendar Header */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-xl font-sen font-bold text-[#3E2C22]">Welcome back!</Text>
            <Text className="text-sm font-sen text-gray-500">{format(selectedDate, 'MMMM yyyy')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              /* Navigate to Settings or Calendar Select */
            }}
          >
            <CalendarPlus size={28} color="#3E2C22" opacity={0.75} />
          </TouchableOpacity>
        </View>

        {/* Weekdays Selector */}
        <View className="bg-[#FFE8BB] rounded-xl p-2 mb-6">
          <View className="flex-row justify-around items-center">
            {days.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              return (
                <TouchableOpacity key={index} onPress={() => setSelectedDate(day)} className={`items-center p-3 rounded-lg ${isSelected ? 'bg-primary' : ''}`}>
                  <Text className={`text-xs font-poppins font-bold mb-2 ${isSelected ? 'text-white' : 'text-[#3A3C6A]'}`}>{format(day, 'EEE')}</Text>
                  <Text className={`text-xs font-poppins font-bold ${isSelected ? 'text-white' : 'text-[#8A8BB1]'}`}>{format(day, 'd')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Schedule Section */}
      <View className="mb-6">
        <Text className="text-xl font-sen font-bold text-[#3E2C22] mb-4">Schedule ({format(selectedDate, 'dd/MM')})</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#AC3C00" />
        ) : events.length === 0 ? (
          // Empty State
          <View className="items-center justify-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Text className="text-gray-400 font-sen">No classes scheduled for today.</Text>
          </View>
        ) : (
          <View className="relative">
            {/* Render List Events */}
            {events.map((item, index) => {
              const start = new Date(item.startDate);
              const end = new Date(item.endDate);
              const durationMinutes = differenceInMinutes(end, start);
              const durationText =
                durationMinutes > 60 ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? durationMinutes % 60 : ''}` : `${durationMinutes}m`;

              return (
                <View key={index} className="flex-row mb-4">
                  {/* Left Column: Time */}
                  <View className="w-14 items-end pr-3 pt-1">
                    <Text className="text-sm font-sen font-bold text-[#32343E]">{format(start, 'HH:mm')}</Text>
                    <Text className="text-[10px] font-sen text-gray-400">{format(end, 'HH:mm')}</Text>
                  </View>

                  {/* Right Column: Card content */}
                  <View className="flex-1 relative">
                    {/* Vertical Divider Line */}
                    <View className="absolute left-[-1px] top-2 bottom-0 w-[2px] bg-gray-200" />

                    {/* Event Card */}
                    <TouchableOpacity className="bg-primary rounded-2xl p-4 ml-2 min-h-[60px] justify-center shadow-sm" activeOpacity={0.8}>
                      <Text className="text-white font-sen font-semibold text-sm mb-1">{item.title}</Text>
                      {item.location && (
                        <Text className="text-white/80 text-xs font-sen italic">
                          📍 {item.location} • {durationText}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Bottom section (Banner) */}
      <View className="bg-[#3E2C22] rounded-[14px] p-4 -mx-4 shadow-lg mb-10">
        <View className="bg-[#FFE8BB] rounded-[14px] p-4 my-4 relative">
          <Text className="text-center text-[#8D7162] font-sen font-semibold text-base mb-4">Classify unorganized images now!</Text>
          <View className="flex-row justify-center gap-4">
            <Image
              source={{ uri: 'https://api.builder.io/api/v1/image/assets/TEMP/95b04280b55e01348191c16f60da62da3283e88f?width=314' }}
              className="w-32 h-24 rounded-lg bg-gray-300"
              resizeMode="cover"
            />
            <Image
              source={{ uri: 'https://api.builder.io/api/v1/image/assets/TEMP/4eb24e44fc1d974992559a05b185a1168bbb9eed?width=314' }}
              className="w-32 h-24 rounded-lg bg-gray-300"
              resizeMode="cover"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
