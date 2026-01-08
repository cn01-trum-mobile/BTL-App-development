import { UnifiedEvent } from '../types/calendarTypes';
import { authApi } from './authApi';
import Constants from 'expo-constants';

const API_URL = 'https://capdecours.tuanemtramtinh.io.vn';

// Hàm helper fetch
const fetchWithAuth = async (endpoint: string, options: any = {}) => {
  const token = await authApi.getToken();

  if (!token) {
    throw new Error('Missing auth token. Please login first.');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const error: any = new Error(text || 'API Error');
    error.status = response.status; // Lưu status code để check sau
    throw error;
  }
  return response.json();
};

export const calendarApi = {
  // Lấy list sự kiện backend (toàn bộ của user, filter theo ngày ở client)
  getAll: async (): Promise<any[]> => {
    return await fetchWithAuth('/calendar');
  },

  // Tạo mới
  create: async (data: { title: string; startDate: string; endDate: string; notes?: string; location?: string }): Promise<any> => {
    return await fetchWithAuth('/calendar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Cập nhật
  update: async (id: number, data: Partial<Omit<UnifiedEvent, 'id' | 'originalId' | 'source'>>): Promise<any> => {
    return await fetchWithAuth(`/calendar/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Xóa
  delete: async (id: number): Promise<void> => {
    await fetchWithAuth(`/calendar/${id}`, {
      method: 'DELETE',
    });
  },
};
