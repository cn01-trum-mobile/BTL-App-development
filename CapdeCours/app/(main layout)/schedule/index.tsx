import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
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

export default function Schedule() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { events, loading, loadEvents } = useUnifiedCalendar();

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

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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

          <TouchableOpacity onPress={handleAddEvent}>
            <CalendarPlus size={26} color="#3E2C22" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekContainer}>
          <View style={styles.weekRow}>
            {weekDays.map((day, i) => {
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
                  <Text style={[styles.dateText, isSelected && styles.dayTextActive, !isSelected && isVisible && styles.dayTextRange]}>{format(day, 'd')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
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
                    {eventsByDay[dayIndex].map((event, idx) => {
                      const start = new Date(event.startDate);
                      const end = new Date(event.endDate);

                      const startHour = start.getHours();
                      const startMin = start.getMinutes();

                      if (startHour < START_HOUR) return null;

                      const minutesFromStart = (startHour - START_HOUR) * 60 + startMin;
                      const duration = differenceInMinutes(end, start);

                      const top = (minutesFromStart / 60) * SLOT_HEIGHT;
                      const height = (duration / 60) * SLOT_HEIGHT;

                      const bgColor = event.source === 'LOCAL' ? '#AC3C00' : '#2196F3';

                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.eventBlock, { top, height: Math.max(height, 30), backgroundColor: bgColor }]}
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
    fontWeight: 'bold',
    color: '#AC3C00',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
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
    marginTop: 15,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFE8BB',
    borderRadius: 12,
    padding: 6,
  },
  dayItem: {
    flex: 1,
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
    marginTop: -6,
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
