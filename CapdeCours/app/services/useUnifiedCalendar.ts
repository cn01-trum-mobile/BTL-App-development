// hooks/useUnifiedCalendar.ts
import { useState, useCallback } from 'react';
import * as Calendar from 'expo-calendar';
import { getData } from '@/utils/asyncStorage';
import { UnifiedEvent } from '../types/calendarTypes';
import { getLocalEvents } from './localCalendarService';

export const useUnifiedCalendar = () => {
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Hàm load nhận vào Date object (để tương thích với code cũ của bạn)
  const loadEvents = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      // 1. FETCH NATIVE (Google/iOS Calendar)
      const storedIdsJson = await getData('USER_CALENDAR_IDS'); // Lấy từ màn hình Select của bạn
      let nativeEventsMapped: UnifiedEvent[] = [];

      if (storedIdsJson) {
        const calendarIds = JSON.parse(storedIdsJson);
        if (calendarIds.length > 0) {
          const nativeRes = await Calendar.getEventsAsync(calendarIds, start, end);

          nativeEventsMapped = nativeRes.map((e) => ({
            id: `native_${e.id}`,
            originalId: e.id,
            title: e.title,

            // 1. Fix lỗi Date: Ép kiểu về ISO String
            startDate: new Date(e.startDate).toISOString(),
            endDate: new Date(e.endDate).toISOString(),

            // 2. Fix lỗi Location/Notes: Chuyển null thành undefined
            location: e.location || undefined,
            notes: e.notes || undefined,

            source: 'NATIVE' as const, // Thêm as const để chắc chắn type đúng
            calendarId: e.calendarId,
            color: '#2196F3',
          }));
        }
      }

      // 2. FETCH LOCAL (Từ service ở Bước 2)
      // Lưu ý: Local service demo đang load all, thực tế nên filter theo start/end
      const allLocal = await getLocalEvents();
      const localEventsMapped = allLocal.filter((e) => {
        const eStart = new Date(e.startDate).getTime();
        return eStart >= start.getTime() && eStart <= end.getTime();
      });

      // 3. GỘP VÀ SORT
      const merged = [...nativeEventsMapped, ...localEventsMapped].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      setEvents(merged);
    } catch (error) {
      console.error('Lỗi load lịch:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, loadEvents };
};
