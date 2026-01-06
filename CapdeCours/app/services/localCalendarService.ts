// services/localCalendarService.ts
import { getData, storeData } from '@/utils/asyncStorage';
import { UnifiedEvent } from '../types/calendarTypes';
import { v4 as uuidv4 } from 'uuid'; // Nếu chưa có uuid thì dùng Math.random() tạm

const LOCAL_DB_KEY = 'MY_APP_LOCAL_EVENTS';

// Lấy tất cả event local
export const getLocalEvents = async (): Promise<UnifiedEvent[]> => {
  const json = await getData(LOCAL_DB_KEY);
  return json ? JSON.parse(json) : [];
};

// Tạo event mới vào Local DB
export const addLocalEvent = async (eventDetail: Omit<UnifiedEvent, 'id' | 'source' | 'originalId'>) => {
  const currentEvents = await getLocalEvents();

  const newId = Date.now().toString(); // Tạo ID đơn giản
  const newEvent: UnifiedEvent = {
    ...eventDetail,
    id: `local_${newId}`,
    originalId: newId,
    source: 'LOCAL',
    color: '#AC3C00', // Màu đặc trưng của app bạn
  };

  const updatedEvents = [...currentEvents, newEvent];
  await storeData(LOCAL_DB_KEY, JSON.stringify(updatedEvents));
  return newEvent;
};

// Cập nhật event Local
export const updateLocalEvent = async (originalId: string, updates: Partial<UnifiedEvent>) => {
  const currentEvents = await getLocalEvents();
  const index = currentEvents.findIndex((e) => e.originalId === originalId);

  if (index !== -1) {
    currentEvents[index] = { ...currentEvents[index], ...updates };
    await storeData(LOCAL_DB_KEY, JSON.stringify(currentEvents));
  }
};

// Xóa event Local
export const deleteLocalEvent = async (originalId: string) => {
  const currentEvents = await getLocalEvents();
  const filtered = currentEvents.filter((e) => e.originalId !== originalId);
  await storeData(LOCAL_DB_KEY, JSON.stringify(filtered));
};
