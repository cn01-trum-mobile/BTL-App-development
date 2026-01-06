// types/calendarTypes.ts

export interface UnifiedEvent {
  // ID dùng để hiển thị trên UI (React Key)
  // Format: "native_xxxx" hoặc "local_yyyy"
  id: string;

  // ID gốc để dùng khi gọi API sửa/xóa
  originalId: string;

  title: string;
  startDate: string; // Lưu format ISO string (dễ so sánh)
  endDate: string; // Lưu format ISO string
  color?: string;
  location?: string;
  notes?: string;

  // Cờ quan trọng nhất để phân biệt
  source: 'NATIVE' | 'LOCAL';

  // Dùng cho source NATIVE để biết thuộc tài khoản email nào
  calendarId?: string;
}
