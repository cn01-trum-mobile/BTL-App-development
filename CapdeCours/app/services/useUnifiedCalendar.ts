// hooks/useUnifiedCalendar.ts
import { useState, useCallback } from 'react';
import * as Calendar from 'expo-calendar';
import { getData } from '@/utils/asyncStorage';
import { UnifiedEvent } from '../types/calendarTypes';
import { getLocalUnifiedEventsInRange } from './localCalendarService';
import { calendarApi } from './calenderApi';

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

            // Fix lỗi Date: Ép kiểu về ISO String
            startDate: new Date(e.startDate).toISOString(),
            endDate: new Date(e.endDate).toISOString(),

            // Fix lỗi Location/Notes: Chuyển null thành undefined
            location: e.location || undefined,
            notes: e.notes || undefined,

            source: 'NATIVE' as const,
            calendarId: e.calendarId,
            // Hồng: lịch mặc định (native)
            color: '#A44063',
            instanceStartDate: new Date(e.startDate).toISOString(),
          }));
        }
      }

      // 2. FETCH LOCAL/REMOTE (từ AsyncStorage – đã map sẵn sang UnifiedEvent)
      const localAndRemote = await getLocalUnifiedEventsInRange(start, end);

      // 3. FETCH REMOTE trực tiếp (đồng bộ xuống đơn giản, không lưu offline)
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
            originalId: String(e.id), // nếu muốn lưu offline thì map sang LocalAppEvent sau
            title: e.title,
            startDate: e.startDate,
            endDate: e.endDate,
            location: e.location || undefined,
            notes: e.notes || undefined,
            source: 'REMOTE' as const,
            // Nâu: đã sync cloud
            color: '#42160dbf',
          }));
      } catch (err) {
        // Nếu chưa login hoặc backend lỗi thì chỉ log, không làm app crash
        console.log('Không load được event từ backend:', err);
      }

      // 4. GỘP + DEDUP theo id (ưu tiên bản local/remote trong AsyncStorage vì có thể chứa thay đổi pending)
      const map = new Map<string, UnifiedEvent>();

      // Ưu tiên native trước (id riêng)
      nativeEventsMapped.forEach((ev) => map.set(ev.id, ev));

      // Ưu tiên local/remote đã lưu offline
      localAndRemote.forEach((ev) => map.set(ev.id, ev));

      // Remote fetch trực tiếp: chỉ thêm nếu chưa có (tránh trùng remote_x)
      remoteFromBackend.forEach((ev) => {
        if (!map.has(ev.id)) {
          map.set(ev.id, ev);
        }
      });

      const merged = Array.from(map.values()).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      setEvents(merged);
    } catch (error) {
      console.error('Lỗi load lịch:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, loadEvents };
};
