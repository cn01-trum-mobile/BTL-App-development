// services/calendarActions.ts
import * as Calendar from 'expo-calendar';
import { RepeatRule, UnifiedEvent } from '../types/calendarTypes';
import { addLocalEvent, updateLocalEvent, deleteLocalEvent } from './localCalendarService';

// --- CREATE ---
export const createEvent = async (
  details: { title: string; startDate: Date; endDate: Date; notes?: string; location?: string; repeat?: RepeatRule },
  target: 'LOCAL' | 'NATIVE' = 'LOCAL', // Mặc định lưu Local
  nativeCalendarId?: string
) => {
  if (target === 'LOCAL') {
    // Lưu local (offline-first)
    const local = await addLocalEvent({
      title: details.title,
      startDate: details.startDate.toISOString(),
      endDate: details.endDate.toISOString(),
      notes: details.notes,
      location: details.location,
      repeat: details.repeat,
    });

    // KHÔNG sync ở đây - để caller (addEvent.tsx) tự quyết định khi nào sync
    // Tránh duplicate sync

    return local;
  } else if (target === 'NATIVE' && nativeCalendarId) {
    // Expo calendar cần Date object, không sync backend
    await Calendar.createEventAsync(nativeCalendarId, {
      title: details.title,
      startDate: details.startDate,
      endDate: details.endDate,
      notes: details.notes,
      location: details.location,
    });
  }
};

// --- UPDATE ---
export const updateEvent = async (event: UnifiedEvent, newDetails: { title: string; startDate: Date; endDate: Date; repeat?: RepeatRule }) => {
  if (event.source === 'LOCAL' || event.source === 'REMOTE') {
    await updateLocalEvent(event.originalId, {
      title: newDetails.title,
      startDate: newDetails.startDate.toISOString(),
      endDate: newDetails.endDate.toISOString(),
      repeat: newDetails.repeat,
    });

    // KHÔNG sync ở đây - để caller (addEvent.tsx) tự quyết định khi nào sync
    // Tránh duplicate sync
  } else if (event.source === 'NATIVE') {
    // Native update (không sync backend)
    // Fix crash/mất dữ liệu cho event lặp lại:
    // - Preserve các fields có sẵn (notes, location, alarms, recurrenceRule...)
    // - Nếu là recurring instance, thử truyền options instanceStartDate/futureEvents (nếu runtime hỗ trợ)
    const existing = await Calendar.getEventAsync(event.originalId);
    const updateConfig: any = {
      ...existing,
      title: newDetails.title,
      startDate: newDetails.startDate,
      endDate: newDetails.endDate,
    };

    const options: any = {};
    if (event.instanceStartDate) {
      options.instanceStartDate = new Date(event.instanceStartDate);
      options.futureEvents = false;
    }

    try {
      if (Object.keys(options).length > 0) {
        await (Calendar as any).updateEventAsync(event.originalId, updateConfig, options);
      } else {
        await Calendar.updateEventAsync(event.originalId, updateConfig);
      }
    } catch (err) {
      // Fallback: một số build chỉ hỗ trợ 2 tham số
      await Calendar.updateEventAsync(event.originalId, updateConfig);
      console.warn('Native update fallback executed:', err);
    }
  }
};

// --- DELETE ---
export const deleteEvent = async (event: UnifiedEvent) => {
  if (event.source === 'LOCAL' || event.source === 'REMOTE') {
    await deleteLocalEvent(event.originalId);
    // KHÔNG sync ở đây - để caller (addEvent.tsx) tự quyết định khi nào sync
    // Tránh duplicate sync
  } else if (event.source === 'NATIVE') {
    await Calendar.deleteEventAsync(event.originalId);
  }
};
