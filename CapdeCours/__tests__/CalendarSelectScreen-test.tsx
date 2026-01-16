import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CalendarSelectScreen from '../app/(main layout)/login/chooseCalendar'; // Sửa lại đường dẫn import file của bạn
import * as Calendar from 'expo-calendar';
import { getData, storeData } from '@/utils/asyncStorage';
import { Alert } from 'react-native';

// --- 1. MOCK CÁC THƯ VIỆN BÊN NGOÀI ---

// Mock Expo Calendar
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  EntityTypes: {
    EVENT: 'event',
  },
}));

// Mock AsyncStorage wrapper
jest.mock('@/utils/asyncStorage', () => ({
  getData: jest.fn(),
  storeData: jest.fn(),
}));

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Expo Router / Navigation
const mockNavigation = {
  navigate: jest.fn(),
};

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('CalendarSelectScreen', () => {
  // Dữ liệu giả lập cho lịch
  const mockCalendars = [
    {
      id: '1',
      title: 'Work Calendar',
      source: { type: 'com.google', name: 'user@work.com' }, // Thỏa mãn điều kiện Android/Google
      allowsModifications: true,
    },
    {
      id: '2',
      title: 'Spam Calendar',
      source: { type: 'LOCAL', name: 'Phone' }, // Sẽ bị lọc bỏ (type LOCAL)
      allowsModifications: true,
    },
    {
      id: '3',
      title: 'My iOS Gmail',
      source: { type: 'caldav', name: 'Gmail' }, // Thỏa mãn điều kiện iOS
      allowsModifications: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hiển thị Alert nếu quyền truy cập bị từ chối', async () => {
    // Setup: Quyền bị từ chối
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    render(<CalendarSelectScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Cần quyền truy cập', 'Ứng dụng cần quyền đọc lịch để hoạt động.');
    });
  });

  it('tải và hiển thị danh sách lịch hợp lệ (lọc bỏ lịch rác)', async () => {
    // Setup: Quyền OK, trả về danh sách lịch, chưa có lịch nào được lưu trước đó
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue(mockCalendars);
    (getData as jest.Mock).mockResolvedValue(null);

    const { getByText, queryByText } = render(<CalendarSelectScreen navigation={mockNavigation} />);

    // Chờ loading xong
    await waitFor(() => expect(queryByText('Work Calendar')).toBeTruthy());

    // CHECK: Lịch hợp lệ phải hiện
    expect(getByText('Work Calendar')).toBeTruthy();
    expect(getByText('My iOS Gmail')).toBeTruthy();

    // CHECK: Lịch rác (LOCAL) không được hiện
    expect(queryByText('Spam Calendar')).toBeNull();
  });

  it('khôi phục trạng thái đã chọn từ AsyncStorage (Re-hydrate)', async () => {
    // Setup: Đã từng lưu ID '1'
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue(mockCalendars);
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(['1'])); // ID 1 đã được chọn trước đó

    const { getByText } = render(<CalendarSelectScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Work Calendar')).toBeTruthy());

    // Nút Continue phải hiện số lượng là 1
    expect(getByText('FINISH (1)')).toBeTruthy();
  });

  it('cho phép người dùng chọn và bỏ chọn lịch', async () => {
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue(mockCalendars);
    (getData as jest.Mock).mockResolvedValue(null);

    const { getByText } = render(<CalendarSelectScreen navigation={mockNavigation} />);

    await waitFor(() => expect(getByText('Work Calendar')).toBeTruthy());

    const calendarItem = getByText('Work Calendar');

    // 1. Click chọn
    fireEvent.press(calendarItem);
    // Nút Continue cập nhật thành 1
    expect(getByText('FINISH (1)')).toBeTruthy();

    // 2. Click lần nữa để bỏ chọn
    fireEvent.press(calendarItem);
    // Nút Continue quay về disabled hoặc 0 (tùy logic render text, ở đây check text không còn số 1)
    // Vì code của bạn: disabled={selectedIds.size === 0}, text là FINISH ({size})
    expect(getByText('FINISH')).toBeTruthy();
  });

  it('lưu dữ liệu thành công khi bấm Continue', async () => {
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue(mockCalendars);
    (getData as jest.Mock).mockResolvedValue(null);

    const { getByText } = render(<CalendarSelectScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Work Calendar')).toBeTruthy());

    // Chọn 2 lịch
    fireEvent.press(getByText('Work Calendar'));
    fireEvent.press(getByText('My iOS Gmail'));

    const continueBtn = getByText('FINISH (2)');
    fireEvent.press(continueBtn);

    // Kiểm tra gọi storeData
    await waitFor(() => {
      // Logic trong code: storeData('USER_CALENDAR_IDS', JSON.stringify(idsArray))
      // Thứ tự trong Set không đảm bảo, nên dùng arrayContaining hoặc check logic
      expect(storeData).toHaveBeenCalledWith(
        'USER_CALENDAR_IDS',
        expect.stringMatching(/\[.*\]/) // Check xem có phải string array không
      );
      
      // Check Alert Success
      expect(Alert.alert).toHaveBeenCalledWith('Thành công', 'Đã cập nhật thành công');
    });
  });

});