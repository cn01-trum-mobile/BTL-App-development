import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { CalendarPlus } from 'lucide-react-native';
import { addDays, format, isSameDay, startOfWeek, endOfDay, startOfDay, differenceInMinutes, isWithinInterval } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native'; // Hoặc 'expo-router'
import { File, Directory, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';

import { useUnifiedCalendar } from '@/app/services/useUnifiedCalendar';
import * as Calendar from 'expo-calendar';
import { getData } from '@/utils/asyncStorage';
import { UnifiedEvent } from '@/app/types/calendarTypes';
import { getLocalUnifiedEventsInRange } from '@/app/services/localCalendarService';
import { calendarApi } from '@/app/services/calenderApi';
import { clearFolderCache, updateCacheAfterMove } from '@/utils/photoCache';

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
  const [classifying, setClassifying] = useState(false);

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

  const sanitizeFolderName = useCallback((name: string) => {
    return name.trim();
  }, []);

  // Load unorganized images
  const loadUnorganizedImages = useCallback(async () => {
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

      const imageFiles = files.filter(
        (f): f is File =>
          f instanceof File && (f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg') || f.name.toLowerCase().endsWith('.png'))
      );

      // Lấy tất cả ảnh nhưng chỉ hiển thị 2 ảnh đầu
      const allImageUris = imageFiles.map((file) => file.uri);
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUnorganizedImages();

      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);
      loadEvents(start, end);
    }, [selectedDate, loadEvents, loadUnorganizedImages])
  );

  const handleAddEvent = () => {
    router.push('/(main layout)/schedule/addEvent');
  };

  // Helper: lấy unified events trong range (giống useUnifiedCalendar nhưng dạng hàm thuần để dùng cho auto-classify)
  const fetchUnifiedEventsForRange = useCallback(async (start: Date, end: Date): Promise<UnifiedEvent[]> => {
    let nativeEventsMapped: UnifiedEvent[] = [];

    // 1. NATIVE
    try {
      const storedIdsJson = await getData('USER_CALENDAR_IDS');
      if (storedIdsJson) {
        const calendarIds = JSON.parse(storedIdsJson);
        if (calendarIds.length > 0) {
          const nativeRes = await Calendar.getEventsAsync(calendarIds, start, end);
          nativeEventsMapped = nativeRes.map((e) => ({
            id: `native_${e.id}`,
            originalId: e.id,
            title: e.title,
            startDate: new Date(e.startDate).toISOString(),
            endDate: new Date(e.endDate).toISOString(),
            location: e.location || undefined,
            notes: e.notes || undefined,
            source: 'NATIVE' as const,
            calendarId: e.calendarId,
            color: '#A44063',
            instanceStartDate: new Date(e.startDate).toISOString(),
          }));
        }
      }
    } catch (err) {
      console.warn('Không load được native calendar khi auto-classify:', err);
    }

    // 2. LOCAL/REMOTE (offline)
    const localAndRemote = await getLocalUnifiedEventsInRange(start, end);

    // 3. REMOTE trực tiếp (backend)
    let remoteFromBackend: UnifiedEvent[] = [];
    try {
      const remoteEvents = await calendarApi.getAll();
      remoteFromBackend = remoteEvents
        .filter((e: any) => {
          const eStart = new Date(e.startDate).getTime();
          return eStart >= start.getTime() && eStart <= end.getTime();
        })
        .map((e: any) => ({
          id: `remote_${e.id}`,
          originalId: String(e.id),
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          location: e.location || undefined,
          notes: e.notes || undefined,
          source: 'REMOTE' as const,
          color: '#42160dbf',
        }));
    } catch (err) {
      console.warn('Không load được event backend khi auto-classify:', err);
    }

    // 4. Gộp như useUnifiedCalendar
    const map = new Map<string, UnifiedEvent>();
    nativeEventsMapped.forEach((ev) => map.set(ev.id, ev));
    localAndRemote.forEach((ev) => map.set(ev.id, ev));
    remoteFromBackend.forEach((ev) => {
      if (!map.has(ev.id)) map.set(ev.id, ev);
    });

    const merged = Array.from(map.values()).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return merged;
  }, []);

  // Auto phân loại ảnh trong Unorganized bằng lịch (kể cả event quá khứ)
  const autoClassifyUnorganized = useCallback(async () => {
    try {
      setClassifying(true);

      const photosDir = new Directory(Paths.document, 'photos');
      const unorganizedDir = new Directory(photosDir, 'Unorganized');

      if (!unorganizedDir.exists) {
        return;
      }

      const files = unorganizedDir.list();
      const imageFiles = files.filter(
        (f): f is File =>
          f instanceof File && (f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg') || f.name.toLowerCase().endsWith('.png'))
      );

      if (imageFiles.length === 0) return;

      // Group ảnh theo ngày chụp (dựa trên metadata.time)
      const groups = new Map<string, { file: File; jsonFile: File; time: Date; metadata: any }[]>();

      for (const img of imageFiles) {
        const jsonPath = img.uri.replace(/\.(jpg|jpeg|png)$/i, '.json');
        const jsonFile = new File(jsonPath);
        if (!jsonFile.exists) continue;

        try {
          const content = await jsonFile.text();
          const meta = JSON.parse(content);
          if (!meta.time) continue;
          const time = new Date(meta.time);
          if (isNaN(time.getTime())) continue;

          const dayKey = format(time, 'yyyy-MM-dd');
          const arr = groups.get(dayKey) || [];
          arr.push({ file: img, jsonFile, time, metadata: meta });
          groups.set(dayKey, arr);
        } catch (err) {
          console.warn('Không đọc được metadata của ảnh:', img.uri, err);
        }
      }

      if (groups.size === 0) return;

      // Duyệt từng ngày, load events cho ngày đó rồi classify ảnh trong group
      for (const [, photosOfDay] of groups) {
        if (photosOfDay.length === 0) continue;
        const day = photosOfDay[0].time;
        const start = startOfDay(day);
        const end = endOfDay(day);

        const eventsInDay = await fetchUnifiedEventsForRange(start, end);
        if (!eventsInDay || eventsInDay.length === 0) continue;

        for (const item of photosOfDay) {
          const captureTime = item.time;

          const matchedEvent = eventsInDay.find((ev) => {
            const s = new Date(ev.startDate);
            const e = new Date(ev.endDate);
            if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
            return isWithinInterval(captureTime, { start: s, end: e });
          });

          if (!matchedEvent) continue;

          const targetFolderRaw = sanitizeFolderName(matchedEvent.title || '');
          const targetFolder = targetFolderRaw || 'Unorganized';

          // Nếu vẫn là Unorganized thì bỏ qua
          if (targetFolder === 'Unorganized') continue;

          // 1. Tạo/tham chiếu folder đích
          const destFolderDir = new Directory(photosDir, targetFolder);
          if (!destFolderDir.exists) destFolderDir.create();

          // 2. Tên file giữ nguyên
          const fileName = item.file.name;
          const jsonName = item.jsonFile.name;

          const newImageFile = new File(destFolderDir, fileName);
          const newJsonFile = new File(destFolderDir, jsonName);

          // 3. Move file vật lý (từ Unorganized sang folder mới)
          if (item.file.exists) {
            await item.file.move(newImageFile);
          }
          if (item.jsonFile.exists) {
            await item.jsonFile.move(newJsonFile);
          }

          // 4. Cập nhật metadata JSON: folder/subject/session giữ time gốc
          try {
            const content = await newJsonFile.text();
            const meta = JSON.parse(content);
            const sessionKey = format(captureTime, 'yyyy-MM-dd');
            meta.folder = targetFolder;
            meta.subject = targetFolder;
            meta.session = sessionKey;
            await newJsonFile.write(JSON.stringify(meta, null, 2));
          } catch (err) {
            console.warn('Không update được metadata sau khi move:', newJsonFile.uri, err);
          }

          // 5. Update cache (xóa khỏi Unorganized, thêm vào folder mới)
          try {
            await updateCacheAfterMove('Unorganized', targetFolder, item.file.uri, {
              uri: newImageFile.uri,
              session: format(captureTime, 'yyyy-MM-dd'),
              subject: targetFolder,
            });
          } catch (err) {
            console.warn('Không update cache sau auto-classify:', err);
          }
        }
      }

      // Clear cache hai folder để các màn hình khác reload lại chính xác
      await clearFolderCache('Unorganized');
      // Không biết chính xác tất cả folder đích đã dùng, nhưng sessionFolders sẽ clear khi focus lại.

      // Reload lại danh sách Unorganized ở Home
      await loadUnorganizedImages();
    } catch (err) {
      console.error('Lỗi auto-classify Unorganized:', err);
    } finally {
      setClassifying(false);
    }
  }, [fetchUnifiedEventsForRange, loadUnorganizedImages, sanitizeFolderName]);

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
            {unorganizedImages.length > 0 ? 'Classify unorganized images now!' : 'All images are organized!'}
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
                  <Image source={{ uri }} className="w-32 h-24 rounded-lg bg-gray-300" resizeMode="cover" />
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
              <Text className="text-[#8D7162] font-sen text-sm text-center">All your photos are neatly organized in folders. Great job!</Text>
            </View>
          )}

          {/* Nút để navigate tới folder Unorganized */}
          {unorganizedImages.length > 0 && (
            <>
              <TouchableOpacity className="mt-2 bg-[#8D7162] py-2 px-4 rounded-lg" disabled={classifying} onPress={autoClassifyUnorganized}>
                {classifying ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text className="text-center text-white font-sen font-semibold text-base">Auto classify these images</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-3 bg-[#AC3C00] py-2 px-4 rounded-lg"
                onPress={() => {
                  // Navigate tới folder Unorganized
                  router.push({
                    pathname: '/sessionFolders/[folderName]',
                    params: { folderName: 'Unorganized' },
                  });
                }}
              >
                <Text className="text-center text-white font-sen font-semibold text-base">{`View ${totalUnorganizedImages} unorganized images`}</Text>
              </TouchableOpacity>
            </>
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
