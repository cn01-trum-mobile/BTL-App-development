import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { addDays, differenceInMinutes, endOfDay, format, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { CalendarPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useUnifiedCalendar } from '@/app/services/useUnifiedCalendar';
import { UnifiedEvent } from '@/app/types/calendarTypes';

const START_HOUR = 0;
const END_HOUR = 24;
const SLOT_HEIGHT = 60;
const TIME_COLUMN_WIDTH = 50;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function Schedule() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekIndex, setCurrentWeekIndex] = useState(50); // Bắt đầu ở giữa (tuần 0 = tuần hiện tại)
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

  const visibleDates = useMemo(() => {
    return [selectedDate, addDays(selectedDate, 1), addDays(selectedDate, 2)];
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      const start = startOfDay(visibleDates[0]);
      const end = endOfDay(visibleDates[2]);
      loadEvents(start, end);
    }, [visibleDates, loadEvents])
  );

  const eventsByDay = useMemo(() => {
    return visibleDates.map((day) => events.filter((e) => isSameDay(new Date(e.startDate), day)));
  }, [events, visibleDates]);

  // Scroll đến đúng tuần hiện tại khi component mount
  useEffect(() => {
    // Đợi một chút để FlatList render xong
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
  }, []); // Chỉ chạy 1 lần khi mount

  // Khi scroll tuần, cập nhật selectedDate về ngày đầu tuần nếu chưa có trong tuần đó
  const handleWeekScroll = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      if (index >= 0 && index < weeks.length && index !== currentWeekIndex) {
        setCurrentWeekIndex(index);
        const newWeek = weeks[index];
        if (newWeek) {
          // Nếu selectedDate không nằm trong tuần mới, chuyển sang ngày đầu tuần
          const isDateInWeek = newWeek.weekDays.some((day) => isSameDay(day, selectedDate));
          if (!isDateInWeek) {
            setSelectedDate(newWeek.weekDays[0]);
          }
        }
      }
    },
    [currentWeekIndex, weeks, selectedDate]
  );

  const handleAddEvent = () => {
    router.push('/(main layout)/schedule/addEvent');
  };

  const handleEditEvent = (event: UnifiedEvent) => {
    router.push({
      pathname: '/(main layout)/schedule/addEvent',
      params: {
        mode: 'edit',
        event: JSON.stringify(event),
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.headerTitle}>Schedule</Text>
            <Text style={styles.monthText}>{format(selectedDate, 'MMMM yyyy')}</Text>
          </View>

          <TouchableOpacity testID="add-btn" onPress={handleAddEvent}>
            <CalendarPlus size={26} color="#3E2C22" />
          </TouchableOpacity>
        </View>
      </View>
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
            // Nếu scroll fail, thử lại sau một chút
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
            // 1. Wrapper bao ngoài: Chiều rộng bằng đúng màn hình để paging chuẩn
            <View style={{ width: SCREEN_WIDTH, alignItems: 'flex-start', justifyContent: 'center' }}>
              {/* 2. Nội dung bên trong: Set chiều rộng nhỏ hơn để tạo khoảng cách 2 bên */}
              <View style={[styles.weekRow, { width: SCREEN_WIDTH * 0.9 }]}>
                {item.weekDays.map((day: Date, i: number) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isVisible = visibleDates.some((d) => isSameDay(d, day));

                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setSelectedDate(day)}
                      style={[styles.dayItem, isSelected && styles.dayMain, !isSelected && isVisible && styles.dayRange]}
                    >
                      <Text style={[styles.dayText, isSelected && styles.dayTextActive, !isSelected && isVisible && styles.dayTextRange]}>
                        {format(day, 'EEE')}
                      </Text>
                      <Text style={[styles.dateText, isSelected && styles.dayTextActive, !isSelected && isVisible && styles.dayTextRange]}>
                        {format(day, 'd')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        />
      </View>
      <View style={styles.gridHeader}>
        <View style={{ width: TIME_COLUMN_WIDTH }} />

        <View style={styles.daysHeaderContainer}>
          {visibleDates.map((day, index) => (
            <View key={index} style={styles.dayHeaderCell}>
              <Text style={styles.dayHeaderName}>{format(day, 'EEE')}</Text>
              <Text style={styles.dayHeaderDate}>{format(day, 'd/M')}</Text>
            </View>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#AC3C00" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.gridWrapper}>
            <View style={styles.timeColumn}>
              {HOURS.map((hour) => (
                <View key={hour} style={styles.timeLabelContainer}>
                  <Text style={styles.timeText}>{hour}:00</Text>
                </View>
              ))}
            </View>

            <View style={styles.daysContainer}>
              {visibleDates.map((day, dayIndex) => (
                <View key={dayIndex} style={styles.dayColumn}>
                  {HOURS.map((hour) => (
                    <View key={hour} style={styles.hourCell} />
                  ))}

                  <View style={styles.eventsLayer}>
                    {eventsByDay[dayIndex].map((event) => {
                      // Parse ISO string - new Date() tự động convert sang local timezone
                      const start = new Date(event.startDate);
                      const end = new Date(event.endDate);

                      // Lấy giờ/phút theo local timezone của thiết bị
                      const startHour = start.getHours();
                      const startMin = start.getMinutes();
                      console.log('startHour', startHour);
                      console.log('startMin', startMin);

                      if (startHour < START_HOUR) return null;

                      // Tính số phút từ START_HOUR (0h) đến giờ bắt đầu event
                      // Ví dụ: event 17:30 → (17 - 0) * 60 + 30 = 1050 phút
                      const minutesFromStart = (startHour - START_HOUR) * 60 + startMin;

                      // Tính duration (phút)
                      const duration = differenceInMinutes(end, start);

                      // Tính top: mỗi phút = SLOT_HEIGHT / 60 pixels
                      // Ví dụ: 1050 phút * (60px / 60 phút) = 1050px từ top
                      const top = minutesFromStart * (SLOT_HEIGHT / 60);

                      // Tính height: duration (phút) * (SLOT_HEIGHT / 60)
                      const height = Math.max(duration * (SLOT_HEIGHT / 60), 30);

                      const bgColor = event.source === 'LOCAL' ? '#AC3C00' : event.source === 'REMOTE' ? '#42160dbf' : '#A44063';

                      return (
                        <TouchableOpacity
                          key={event.id}
                          style={[styles.eventBlock, { top, height, backgroundColor: bgColor }]}
                          activeOpacity={0.8}
                          onPress={() => handleEditEvent(event)}
                        >
                          <Text numberOfLines={1} style={styles.eventTitle}>
                            {event.title}
                          </Text>
                          <Text style={styles.eventTime}>{format(start, 'HH:mm')}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View style={{ height: 50 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E3',
    fontFamily: 'Poppins-Regular',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    // paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#FFF8E3',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#AC3C00',
  },
  monthText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    // fontWeight: 'bold',
    // fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#AC3C00',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    gap: 5,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
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
    // marginHorizontal: 16, // Padding bên trong để có khoảng cách 2 bên
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
  dayRange: {
    backgroundColor: '#FFD7A8',
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
  dayTextRange: {
    color: '#7C2D12',
  },

  gridHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFF8E3',
    paddingBottom: 8,
  },
  daysHeaderContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderColor: 'transparent',
  },
  dayHeaderName: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  dayHeaderDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#32343E',
  },

  scrollView: {
    flex: 1,
  },
  gridWrapper: {
    flexDirection: 'row',
    paddingTop: 10,
  },
  timeColumn: {
    marginTop: -8,
    width: TIME_COLUMN_WIDTH,
    alignItems: 'center',
  },
  daysContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  timeLabelContainer: {
    height: SLOT_HEIGHT,
    justifyContent: 'flex-start',
    // marginTop: -2,
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dayColumn: {
    flex: 1,
    borderLeftWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  hourCell: {
    height: SLOT_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderStyle: 'solid',
  },
  eventsLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  eventBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 6,
    padding: 4,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.5)',
  },
  eventTitle: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    marginTop: 1,
  },
});
