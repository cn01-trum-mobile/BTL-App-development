// services/calendarActions.ts
import * as Calendar from 'expo-calendar';
import { UnifiedEvent } from '../types/calendarTypes';
import { addLocalEvent, updateLocalEvent, deleteLocalEvent } from './localCalendarService';

// --- CREATE ---
export const createEvent = async (
  details: { title: string; startDate: Date; endDate: Date; notes?: string; location?: string },
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
export const updateEvent = async (event: UnifiedEvent, newDetails: { title: string; startDate: Date; endDate: Date }) => {
  if (event.source === 'LOCAL' || event.source === 'REMOTE') {
    await updateLocalEvent(event.originalId, {
      title: newDetails.title,
      startDate: newDetails.startDate.toISOString(),
      endDate: newDetails.endDate.toISOString(),
    });

    // KHÔNG sync ở đây - để caller (addEvent.tsx) tự quyết định khi nào sync
    // Tránh duplicate sync
  } else if (event.source === 'NATIVE') {
    // Native update (không sync backend)
    const updateConfig = {
      title: newDetails.title,
      startDate: newDetails.startDate,
      endDate: newDetails.endDate,
    };
    await Calendar.updateEventAsync(event.originalId, updateConfig);
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
