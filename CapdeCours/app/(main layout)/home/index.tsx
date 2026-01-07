import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, StyleSheet, FlatList, Dimensions } from 'react-native';
import { CalendarPlus } from 'lucide-react-native';
import { addDays, format, isSameDay, startOfWeek, endOfDay, startOfDay, differenceInMinutes } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

import { useUnifiedCalendar } from '@/app/services/useUnifiedCalendar';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekIndex, setCurrentWeekIndex] = useState(50);
  const weekListRef = useRef<FlatList>(null);

  const { events, loading, loadEvents } = useUnifiedCalendar();

  // Tạo mảng các tuần (50 tuần trước và 50 tuần sau tuần hiện tại)
  const weeks = useMemo(() => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weeksArray = [];
    for (let i = -50; i <= 50; i++) {
      const weekStart = addDays(currentWeekStart, i * 7);
      weeksArray.push({
        weekStart,
        weekDays: Array.from({ length: 7 }, (_, j) => addDays(weekStart, j)),
      });
    }
    return weeksArray;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);
      loadEvents(start, end);
    }, [selectedDate, loadEvents])
  );

  // Scroll đến đúng tuần hiện tại khi component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (weekListRef.current) {
        weekListRef.current.scrollToIndex({
          index: currentWeekIndex,
          animated: false,
        });
      }
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi scroll tuần, cập nhật selectedDate
  const handleWeekScroll = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      if (index >= 0 && index < weeks.length && index !== currentWeekIndex) {
        setCurrentWeekIndex(index);
        const newWeek = weeks[index];
        if (newWeek) {
          const isDateInWeek = newWeek.weekDays.some((day) => isSameDay(day, selectedDate));
          if (!isDateInWeek) {
            setSelectedDate(newWeek.weekDays[0]);
          }
        }
      }
    },
    [currentWeekIndex, weeks, selectedDate]
  );

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
            <CalendarPlus size={28} color="#3E2C22" />
          </TouchableOpacity>
        </View>

        {/* Weekdays Selector - Giống schedule */}
        <View style={styles.weekContainer}>
          <FlatList
            ref={weekListRef}
            data={weeks}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `week-${index}`}
            initialScrollIndex={currentWeekIndex}
            getItemLayout={(data, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={handleWeekScroll}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                if (weekListRef.current) {
                  weekListRef.current.scrollToIndex({
                    index: info.index,
                    animated: false,
                  });
                }
              }, 100);
            }}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, alignItems: 'flex-start', justifyContent: 'center' }}>
                <View style={[styles.weekRow, { width: SCREEN_WIDTH * 0.9 }]}>
                  {item.weekDays.map((day: Date, i: number) => {
                    const isSelected = isSameDay(day, selectedDate);
                    return (
                      <TouchableOpacity key={i} onPress={() => setSelectedDate(day)} style={[styles.dayItem, isSelected && styles.dayMain]}>
                        <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{format(day, 'EEE')}</Text>
                        <Text style={[styles.dateText, isSelected && styles.dayTextActive]}>{format(day, 'd')}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />
        </View>
      </View>

      {/* Schedule Section */}
      <View style={styles.scheduleSection}>
        <Text style={styles.scheduleTitle}>Schedule ({format(selectedDate, 'dd/MM')})</Text>

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

              const bgColor = item.source === 'LOCAL' ? '#AC3C00' : item.source === 'REMOTE' ? '#10B981' : '#2196F3';

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
      <View style={styles.bannerContainer}>
        <View style={styles.bannerInner}>
          <Text style={styles.bannerText}>Classify unorganized images now!</Text>
          <View style={styles.bannerImages}>
            <Image
              source={{ uri: 'https://api.builder.io/api/v1/image/assets/TEMP/95b04280b55e01348191c16f60da62da3283e88f?width=314' }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <Image
              source={{ uri: 'https://api.builder.io/api/v1/image/assets/TEMP/4eb24e44fc1d974992559a05b185a1168bbb9eed?width=314' }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>
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
    marginBottom: 20,
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
    fontFamily: 'Poppins-Regular',
    fontWeight: '600',
    color: '#3A3C6A',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
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
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#3E2C22',
    marginBottom: 16,
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
    padding: 16,
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
    fontSize: 16,
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
