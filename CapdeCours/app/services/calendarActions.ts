// services/calendarActions.ts
import * as Calendar from 'expo-calendar';
import { UnifiedEvent } from '../types/calendarTypes';
import { addLocalEvent, updateLocalEvent, deleteLocalEvent } from './localCalendarService';

// --- CREATE ---
export const createEvent = async (
  details: { title: string; startDate: Date; endDate: Date; notes?: string },
  target: 'LOCAL' | 'NATIVE' = 'LOCAL', // Mặc định lưu Local
  nativeCalendarId?: string
) => {
  // Format lại dữ liệu cho Local DB
  const formattedDetails = {
    title: details.title,
    startDate: details.startDate.toISOString(),
    endDate: details.endDate.toISOString(),
    notes: details.notes || '',
  };

  if (target === 'LOCAL') {
    return await addLocalEvent(formattedDetails);
  } else if (target === 'NATIVE' && nativeCalendarId) {
    // Expo calendar cần Date object
    await Calendar.createEventAsync(nativeCalendarId, {
      title: details.title,
      startDate: details.startDate,
      endDate: details.endDate,
      notes: details.notes,
    });
  }
};

// --- UPDATE ---
export const updateEvent = async (event: UnifiedEvent, newDetails: { title: string; startDate: Date; endDate: Date }) => {
  if (event.source === 'LOCAL') {
    const updates = {
      title: newDetails.title,
      startDate: newDetails.startDate.toISOString(),
      endDate: newDetails.endDate.toISOString(),
    };
    await updateLocalEvent(event.originalId, updates);
  } else {
    // Native update
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
  if (event.source === 'LOCAL') {
    await deleteLocalEvent(event.originalId);
  } else {
    await Calendar.deleteEventAsync(event.originalId);
  }
};
