import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { CalendarPlus } from 'lucide-react-native';
import { addDays, format, isSameDay, startOfWeek, endOfDay, startOfDay, differenceInMinutes } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native'; // Hoặc 'expo-router'
import { File, Directory, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';

import { useUnifiedCalendar } from '@/app/services/useUnifiedCalendar';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const router = useRouter();

  // --- NEW CODE: Thay thế state cũ bằng Hook ---
  // Hook tự quản lý loading và events rồi, không cần useState thủ công nữa
  const { events, loading, loadEvents } = useUnifiedCalendar();
  // ---------------------------------------------

  const [unorganizedImages, setUnorganizedImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [totalUnorganizedImages, setTotalUnorganizedImages] = useState(0); 



  // Tính toán tuần hiển thị
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // --- NEW CODE: Logic load lại dữ liệu ---
  useFocusEffect(
    useCallback(() => {
      // Hook cần biết load từ ngày nào đến ngày nào
      // Ở Home bạn đang xem theo NGÀY, nên start = đầu ngày, end = cuối ngày
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

      loadEvents(start, end);
    }, [selectedDate, loadEvents])
  );
  // ----------------------------------------

  // Load unorganized images
  const loadUnorganizedImages = async () => {
    try {
      setLoadingImages(true);
      const photosDir = new Directory(Paths.document, 'photos');
      const unorganizedDir = new Directory(photosDir, 'Unorganized');
      
      if (!unorganizedDir.exists) {
        setUnorganizedImages([]);
        setTotalUnorganizedImages(0);
        return;
      }
      
      const files = unorganizedDir.list();
      
      const imageFiles = files.filter((f): f is File => 
        f instanceof File && 
        (f.name.toLowerCase().endsWith('.jpg') || 
        f.name.toLowerCase().endsWith('.jpeg') ||
        f.name.toLowerCase().endsWith('.png'))
      );
      
      // Lấy tất cả ảnh nhưng chỉ hiển thị 2 ảnh đầu
      const allImageUris = imageFiles.map(file => file.uri);
      setUnorganizedImages(allImageUris.slice(0, 2));
      
      // Lưu tổng số ảnh
      setTotalUnorganizedImages(allImageUris.length);
    } catch (error) {
      console.error('Error loading unorganized images:', error);
      setUnorganizedImages([]);
      setTotalUnorganizedImages(0);
    } finally {
      setLoadingImages(false);
    }
  };



  useFocusEffect(
    useCallback(() => {
      loadUnorganizedImages();
      
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);
      loadEvents(start, end);
    }, [selectedDate, loadEvents])
  );

  const handleAddEvent = () => {
    router.push('/(main layout)/schedule/addEvent');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome + Calendar Header */}
      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.monthText}>{format(selectedDate, 'MMMM yyyy')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              /* Navigate to Settings or Calendar Select */
            }}
          >
            <CalendarPlus size={28} color="#3E2C22" onPress={handleAddEvent} />
          </TouchableOpacity>
        </View>

        {/* Weekdays Selector - Style giống schedule */}
        <View style={styles.weekContainer}>
          <View style={styles.weekRow}>
            {days.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              return (
                <TouchableOpacity key={index} onPress={() => setSelectedDate(day)} style={[styles.dayItem, isSelected && styles.dayMain]}>
                  <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{format(day, 'EEE')}</Text>
                  <Text style={[styles.dateText, isSelected && styles.dayTextActive]}>{format(day, 'd')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Schedule Section */}
      <View style={styles.scheduleSection}>
        <Text style={styles.scheduleTitle}>Your Schedule ({format(selectedDate, 'dd/MM')})</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#AC3C00" />
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No classes scheduled for today.</Text>
          </View>
        ) : (
          <View style={styles.eventsContainer}>
            {events.map((item) => {
              const start = new Date(item.startDate);
              const end = new Date(item.endDate);

              const durationMinutes = differenceInMinutes(end, start);
              const durationText =
                durationMinutes > 60 ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? durationMinutes % 60 : ''}` : `${durationMinutes}m`;

              const bgColor = item.source === 'LOCAL' ? '#AC3C00' : item.source === 'REMOTE' ? '#71504a' : '#A44063';

              return (
                <View key={item.id} style={styles.eventRow}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeText}>{format(start, 'HH:mm')}</Text>
                    <Text style={styles.timeTextSmall}>{format(end, 'HH:mm')}</Text>
                  </View>

                  <View style={styles.eventCardContainer}>
                    <View style={styles.dividerLine} />
                    <TouchableOpacity style={[styles.eventCard, { backgroundColor: bgColor }]} activeOpacity={0.8}>
                      <Text style={styles.eventTitle}>{item.title}</Text>
                      {item.location && (
                        <Text style={styles.eventLocation}>
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
          <Text className="text-center text-[#8D7162] font-sen font-semibold text-base mb-4">
            {unorganizedImages.length > 0 
              ? 'Classify unorganized images now!' 
              : 'All images are organized!'}
          </Text>
          
          {loadingImages ? (
            <View className="py-8">
              <ActivityIndicator size="small" color="#8D7162" />
            </View>
          ) : unorganizedImages.length > 0 ? (
            <View className="flex-row justify-center gap-4">
              {unorganizedImages.map((uri, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    // Navigate to ImageDetail với uri của ảnh
                    router.push({
                      pathname: '/imageDetails',
                      params: { uri: uri },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri }}
                    className="w-32 h-24 rounded-lg bg-gray-300"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
              {/* Nếu chỉ có 1 ảnh, thêm placeholder */}
              {unorganizedImages.length === 1 && (
                <View className="w-32 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                  <Text className="text-gray-400 text-xs">+ more</Text>
                </View>
              )}
            </View>
          ) : (
            <View className="py-4 items-center">
              <Text className="text-[#8D7162] font-sen text-sm text-center">
                All your photos are neatly organized in folders. Great job!
              </Text>
            </View>
          )}
          
          {/* Nút để navigate tới folder Unorganized */}
          {unorganizedImages.length > 0 && (
            <TouchableOpacity 
              className="mt-4 bg-[#AC3C00] py-2 px-4 rounded-lg"
              onPress={() => {
                // Navigate tới folder Unorganized
                router.push({
                  pathname: '/sessionFolders/[folderName]', // Updated pathname
                  params: { folderName: 'Unorganized' }
                });
              }}
            >
              <Text className="text-center text-white font-sen font-semibold text-base">
                {`View ${totalUnorganizedImages} unorganized images`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E3',
    paddingHorizontal: 20,
  },
  headerSection: {
    marginBottom: 24,
    paddingTop: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#AC3C00',
  },
  monthText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  weekContainer: {
    marginTop: 10,
    marginBottom: 5,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFE8BB',
    borderRadius: 12,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  dayItem: {
    flex: 0.8,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  dayMain: {
    backgroundColor: '#AC3C00',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A3C6A',
  },
  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
    color: '#3A3C6A',
  },
  dayTextActive: {
    color: '#FFF',
  },
  scheduleSection: {
    marginBottom: 24,
  },
  scheduleTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
  },
  emptyText: {
    color: '#9CA3AF',
    fontFamily: 'Poppins-Regular',
  },
  eventsContainer: {
    position: 'relative',
  },
  eventRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeColumn: {
    width: 56,
    alignItems: 'flex-end',
    paddingRight: 12,
    paddingTop: 4,
  },
  timeText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    fontWeight: 'bold',
    color: '#32343E',
  },
  timeTextSmall: {
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
  },
  eventCardContainer: {
    flex: 1,
    position: 'relative',
  },
  dividerLine: {
    position: 'absolute',
    left: -1,
    top: 8,
    bottom: 0,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
  eventCard: {
    borderRadius: 16,
    padding: 16,
    marginLeft: 8,
    minHeight: 60,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventTitle: {
    color: '#FFF',
    fontFamily: 'Poppins-Regular',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  eventLocation: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    fontStyle: 'italic',
  },
  bannerContainer: {
    backgroundColor: '#3E2C22',
    borderRadius: 14,
    padding: 8,
    marginHorizontal: -20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerInner: {
    backgroundColor: '#FFE8BB',
    borderRadius: 14,
    padding: 16,
    marginVertical: 16,
  },
  bannerText: {
    textAlign: 'center',
    color: '#8D7162',
    fontFamily: 'Poppins-Regular',
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 16,
  },
  bannerImages: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  bannerImage: {
    width: 128,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#D1D5DB',
  },
});
