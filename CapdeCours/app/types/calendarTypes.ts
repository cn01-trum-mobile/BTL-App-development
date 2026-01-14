// types/calendarTypes.ts

// Trạng thái đồng bộ của event tạo trong app
export type SyncStatus = 'pendingCreate' | 'pendingUpdate' | 'pendingDelete' | 'synced';

// Quy tắc lặp lại đơn giản (giống Google Calendar - bản cơ bản)
export type RepeatFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export interface RepeatRule {
  frequency: RepeatFrequency;
  interval: number; // mỗi N ngày/tuần/tháng/năm
  until?: string; // ISO string (optional)
}

// Event "của app" được lưu trong AsyncStorage
export interface LocalAppEvent {
  // ID local luôn tồn tại, dùng để tham chiếu trong app
  localId: string;

  // ID trên backend (có sau khi đã sync create thành công)
  remoteId?: number;

  title: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  location?: string;
  notes?: string;

  // Trạng thái đồng bộ với backend
  syncStatus: SyncStatus;

  // Lần sửa cuối ở local (ISO string)
  updatedAt: string;

  // Soft delete ở local, dùng cho pendingDelete
  deleted?: boolean;

  // Đánh dấu event đã bị disconnect (logout) nhưng vẫn giữ remoteId để tránh duplicate khi login lại
  isDisconnected?: boolean;

  // Lặp lại (chỉ áp dụng cho event do app tạo). Backend hiện chưa hỗ trợ nên chỉ lưu local.
  repeat?: RepeatRule;
}

// Kiểu dùng cho UI (Schedule, AddEvent)
export interface UnifiedEvent {
  // ID dùng để hiển thị trên UI (React Key)
  // Ví dụ: "native_xxxx", "local_yyyy", "remote_zzzz"
  id: string;

  // ID gốc dùng khi sửa/xóa trong app
  // Với event "của app" => chính là localId
  originalId: string;

  title: string;
  startDate: string; // Lưu format ISO string (dễ so sánh)
  endDate: string; // Lưu format ISO string
  color?: string;
  location?: string;
  notes?: string;

  // Cờ phân biệt nguồn
  // NATIVE: lấy từ calendar hệ thống (expo-calendar), chỉ đọc
  // LOCAL: event của app, chưa được sync lên backend
  // REMOTE: event của app đã có trên backend (có remoteId)
  source: 'NATIVE' | 'LOCAL' | 'REMOTE';

  // Dùng cho source NATIVE để biết thuộc tài khoản email nào
  calendarId?: string;

  // Lặp lại (local/app)
  repeat?: RepeatRule;

  // Dùng để update recurring instance của native an toàn
  instanceStartDate?: string; // ISO string
}
