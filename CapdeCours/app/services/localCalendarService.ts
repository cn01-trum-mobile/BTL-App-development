// services/localCalendarService.ts
import { getData, storeData } from '@/utils/asyncStorage';
import { LocalAppEvent, RepeatRule, SyncStatus, UnifiedEvent } from '../types/calendarTypes';
import { calendarApi } from './calenderApi';

const LOCAL_DB_KEY = 'MY_APP_LOCAL_EVENTS_V2';

// Helper tạo ID local đơn giản
const createLocalId = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

const nowIso = () => new Date().toISOString();

// Đọc toàn bộ danh sách LocalAppEvent thô
const loadRawEvents = async (): Promise<LocalAppEvent[]> => {
  const json = await getData(LOCAL_DB_KEY);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as LocalAppEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveRawEvents = async (events: LocalAppEvent[]) => {
  await storeData(LOCAL_DB_KEY, JSON.stringify(events));
};

// Public: lấy toàn bộ raw events (phục vụ debug / sync)
export const getLocalEventsRaw = async (): Promise<LocalAppEvent[]> => {
  return await loadRawEvents();
};

// Map LocalAppEvent -> UnifiedEvent dùng cho UI
const toUnifiedEvent = (e: LocalAppEvent): UnifiedEvent => {
  // Nếu có remoteId nhưng đang disconnected (logout) → hiển thị như LOCAL (màu nâu)
  // Nếu có remoteId và đang connected → hiển thị như REMOTE (màu xanh lá)
  const isRemote = !!e.remoteId && !e.isDisconnected;
  return {
    id: isRemote ? `remote_${e.remoteId}` : `local_${e.localId}`,
    originalId: e.localId,
    title: e.title,
    startDate: e.startDate,
    endDate: e.endDate,
    location: e.location,
    notes: e.notes,
    source: isRemote ? 'REMOTE' : 'LOCAL',
    // Màu theo yêu cầu:
    // - LOCAL: cam (nội bộ chưa sync)
    // - REMOTE: nâu (đã sync cloud)
    color: isRemote ? '#42160dbf' : '#AC3C00',
    repeat: e.repeat,
  };
};

const parseRepeat = (repeat?: RepeatRule) => {
  if (!repeat) return null;
  const interval = Number.isFinite(repeat.interval) && repeat.interval > 0 ? repeat.interval : 1;
  const untilMs = repeat.until ? new Date(repeat.until).getTime() : null;
  return { frequency: repeat.frequency, interval, untilMs };
};

const addPeriod = (d: Date, frequency: RepeatRule['frequency'], interval: number) => {
  const next = new Date(d);
  if (frequency === 'DAILY') next.setDate(next.getDate() + interval);
  else if (frequency === 'WEEKLY') next.setDate(next.getDate() + interval * 7);
  else if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + interval);
  else if (frequency === 'YEARLY') next.setFullYear(next.getFullYear() + interval);
  return next;
};

// Expand event lặp lại thành các instance trong khoảng (chỉ dùng cho UI)
const expandRecurringUnifiedEventsInRange = (e: LocalAppEvent, rangeStart: Date, rangeEnd: Date): UnifiedEvent[] => {
  const cfg = parseRepeat(e.repeat);
  if (!cfg) return [toUnifiedEvent(e)];

  const baseStart = new Date(e.startDate);
  const baseEnd = new Date(e.endDate);
  const durationMs = Math.max(0, baseEnd.getTime() - baseStart.getTime());
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();

  if (!Number.isFinite(baseStart.getTime())) return [toUnifiedEvent(e)];

  const out: UnifiedEvent[] = [];
  let currentStart = new Date(baseStart);
  let safety = 0;

  while (safety < 2000) {
    safety++;
    const curStartMs = currentStart.getTime();
    const curEndMs = curStartMs + durationMs;

    if (cfg.untilMs != null && curStartMs > cfg.untilMs) break;
    if (curStartMs > rangeEndMs) break;

    if (curStartMs >= rangeStartMs && curStartMs <= rangeEndMs) {
      const u = toUnifiedEvent(e);
      const instanceStart = new Date(curStartMs);
      const instanceEnd = new Date(curEndMs);
      const instanceStartIso = instanceStart.toISOString();
      out.push({
        ...u,
        id: `${u.id}_${instanceStartIso}`,
        startDate: instanceStartIso,
        endDate: instanceEnd.toISOString(),
        instanceStartDate: instanceStartIso,
      });
    }

    currentStart = addPeriod(currentStart, cfg.frequency, cfg.interval);
  }

  return out;
};

// Lấy UnifiedEvent trong khoảng ngày (đã bỏ deleted)
export const getLocalUnifiedEventsInRange = async (start: Date, end: Date): Promise<UnifiedEvent[]> => {
  const all = await loadRawEvents();
  return all.filter((e) => !e.deleted).flatMap((e) => expandRecurringUnifiedEventsInRange(e, start, end));
};

// Tạo event mới local (offline-first)
export const addLocalEvent = async (details: {
  title: string;
  startDate: string;
  endDate: string;
  notes?: string;
  location?: string;
  repeat?: RepeatRule;
}): Promise<UnifiedEvent> => {
  const events = await loadRawEvents();
  const localId = createLocalId();

  const newEvent: LocalAppEvent = {
    localId,
    title: details.title,
    startDate: details.startDate,
    endDate: details.endDate,
    notes: details.notes,
    location: details.location,
    syncStatus: 'pendingCreate',
    updatedAt: nowIso(),
    repeat: details.repeat,
  };

  events.push(newEvent);
  await saveRawEvents(events);

  return toUnifiedEvent(newEvent);
};

// Cập nhật event local theo localId
export const updateLocalEvent = async (
  localId: string,
  updates: Partial<Pick<LocalAppEvent, 'title' | 'startDate' | 'endDate' | 'notes' | 'location' | 'repeat'>>
) => {
  const events = await loadRawEvents();
  const index = events.findIndex((e) => e.localId === localId);
  if (index === -1) return;

  const current = events[index];
  let newStatus: SyncStatus = current.syncStatus;

  if (current.syncStatus === 'pendingCreate') {
    newStatus = 'pendingCreate';
  } else if (current.syncStatus === 'pendingDelete') {
    // Đang chờ xóa mà lại sửa thì coi như update mới
    newStatus = 'pendingUpdate';
    current.deleted = false;
  } else {
    newStatus = 'pendingUpdate';
  }

  events[index] = {
    ...current,
    ...updates,
    syncStatus: newStatus,
    updatedAt: nowIso(),
  };

  await saveRawEvents(events);
};

// Đánh dấu xóa local theo localId
export const deleteLocalEvent = async (localId: string) => {
  const events = await loadRawEvents();
  const index = events.findIndex((e) => e.localId === localId);
  if (index === -1) return;

  const current = events[index];

  // Nếu chưa từng sync lên server thì có thể xóa hẳn
  if (!current.remoteId && current.syncStatus === 'pendingCreate') {
    events.splice(index, 1);
  } else {
    events[index] = {
      ...current,
      deleted: true,
      syncStatus: 'pendingDelete',
      updatedAt: nowIso(),
    };
  }

  await saveRawEvents(events);
};

// Hàm đồng bộ local <-> backend (chỉ xử lý chiều UP, chiều DOWN đã được load trực tiếp ở useUnifiedCalendar)
export const syncLocalEventsWithBackend = async () => {
  const events = await loadRawEvents();
  let changed = false;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];

    try {
      if (e.syncStatus === 'pendingCreate' && !e.remoteId && !e.deleted) {
        const created = await calendarApi.create({
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          notes: e.notes,
          location: e.location,
        });

        events[i] = {
          ...e,
          remoteId: created.id,
          syncStatus: 'synced',
        };
        changed = true;
      } else if (e.syncStatus === 'pendingUpdate' && e.remoteId && !e.deleted) {
        await calendarApi.update(e.remoteId, {
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          notes: e.notes,
          location: e.location,
        } as any);

        events[i] = {
          ...e,
          syncStatus: 'synced',
        };
        changed = true;
      } else if (e.syncStatus === 'pendingDelete' && e.remoteId) {
        try {
          await calendarApi.delete(e.remoteId);
          // Sau khi xóa thành công trên server thì xóa hẳn local
          events.splice(i, 1);
          i--;
          changed = true;
        } catch (deleteErr: any) {
          // Nếu 404 (event đã không tồn tại trên server) → xóa luôn khỏi local
          if (deleteErr?.status === 404 || deleteErr?.message?.includes('404') || deleteErr?.message?.includes('Not Found')) {
            // Event đã không tồn tại trên server → xóa luôn khỏi local
            events.splice(i, 1);
            i--;
            changed = true;
          } else {
            // Lỗi khác (mất mạng, token hết hạn...) → giữ nguyên để lần sau sync lại
            console.warn('Sync delete failed', deleteErr);
          }
        }
      }
    } catch (err) {
      // Nếu lỗi (mất mạng, token hết hạn...), giữ nguyên trạng thái để lần sau sync lại
      console.warn('Sync event failed', err);
    }
  }

  if (changed) {
    await saveRawEvents(events);
  }
};

// Đếm số event có remoteId (event từ cloud)
export const getCloudEventsCount = async (): Promise<number> => {
  const events = await loadRawEvents();
  return events.filter((e) => e.remoteId && !e.deleted).length;
};

// Chuyển các event cloud thành local (giữ remoteId để tránh duplicate, nhưng đánh dấu disconnected)
export const convertCloudEventsToLocal = async () => {
  const events = await loadRawEvents();
  let changed = false;

  for (let i = 0; i < events.length; i++) {
    if (events[i].remoteId && !events[i].deleted) {
      events[i] = {
        ...events[i],
        // GIỮ remoteId để khi login lại có thể sync và tránh duplicate
        // Chỉ đánh dấu isDisconnected = true để hiển thị màu nâu (LOCAL)
        isDisconnected: true,
        syncStatus: 'synced', // Giữ synced vì đã từng sync
      };
      changed = true;
    }
  }

  if (changed) {
    await saveRawEvents(events);
  }
};

// Xóa tất cả event có remoteId (event từ cloud)
export const deleteCloudEvents = async () => {
  const events = await loadRawEvents();
  const filtered = events.filter((e) => !e.remoteId || e.deleted);
  await saveRawEvents(filtered);
};

// Đồng bộ events từ cloud xuống local (khi login), tránh duplicate
export const syncCloudEventsToLocal = async () => {
  try {
    // Fetch events từ cloud
    const cloudEvents = await calendarApi.getAll();
    if (!Array.isArray(cloudEvents) || cloudEvents.length === 0) {
      return; // Không có event trên cloud
    }

    const localEvents = await loadRawEvents();
    let changed = false;

    // Tạo Map để tra cứu nhanh event local theo remoteId
    const localByRemoteId = new Map<number, LocalAppEvent>();
    localEvents.forEach((e) => {
      if (e.remoteId) {
        localByRemoteId.set(e.remoteId, e);
      }
    });

    // Xử lý từng event từ cloud
    for (const cloudEvent of cloudEvents) {
      const remoteId = cloudEvent.id;
      if (!remoteId || typeof remoteId !== 'number') continue;

      const existingLocal = localByRemoteId.get(remoteId);

      if (existingLocal) {
        // Đã có trong local → update nếu cần (giữ nguyên localId, chỉ update dữ liệu)
        const needsUpdate =
          existingLocal.title !== cloudEvent.title ||
          existingLocal.startDate !== cloudEvent.startDate ||
          existingLocal.endDate !== cloudEvent.endDate ||
          existingLocal.notes !== (cloudEvent.notes || undefined) ||
          existingLocal.location !== (cloudEvent.location || undefined) ||
          existingLocal.isDisconnected; // Cần update nếu đang disconnected để reconnect

        if (needsUpdate) {
          const index = localEvents.findIndex((e) => e.localId === existingLocal.localId);
          if (index !== -1) {
            localEvents[index] = {
              ...existingLocal,
              title: cloudEvent.title,
              startDate: cloudEvent.startDate,
              endDate: cloudEvent.endDate,
              notes: cloudEvent.notes || undefined,
              location: cloudEvent.location || undefined,
              syncStatus: 'synced', // Đã sync với cloud
              isDisconnected: false, // Clear flag disconnected khi login lại
              updatedAt: nowIso(),
            };
            changed = true;
          }
        }
      } else {
        // Chưa có trong local → tạo mới LocalAppEvent với remoteId
        const newLocalEvent: LocalAppEvent = {
          localId: createLocalId(),
          remoteId: remoteId,
          title: cloudEvent.title,
          startDate: cloudEvent.startDate,
          endDate: cloudEvent.endDate,
          notes: cloudEvent.notes || undefined,
          location: cloudEvent.location || undefined,
          syncStatus: 'synced', // Đã sync với cloud
          updatedAt: nowIso(),
        };
        localEvents.push(newLocalEvent);
        changed = true;
      }
    }

    if (changed) {
      await saveRawEvents(localEvents);
    }
  } catch (err) {
    // Nếu lỗi (mất mạng, token hết hạn...), chỉ log, không crash app
    console.warn('Sync cloud events to local failed:', err);
  }
};
