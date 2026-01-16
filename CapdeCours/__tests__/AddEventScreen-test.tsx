import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AddEventScreen from '../app/(main layout)/schedule/addEvent';
import { Alert, Platform } from 'react-native';
import * as CalendarActions from '@/app/services/calendarActions';
import * as LocalCalendarService from '@/app/services/localCalendarService';

/* ========================================================================== */
/* 1. GLOBAL MOCKS (Định nghĩa biến mock ở ngoài để dùng chung)               */
/* ========================================================================== */

// [FIX QUAN TRỌNG]: Tạo mock function cố định để theo dõi
const mockBack = jest.fn();
const mockPush = jest.fn();
let mockSearchParams = {};

// --- Mock Expo Router ---
jest.mock('expo-router', () => ({
  // Trả về đúng biến mockBack đã định nghĩa ở trên
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
  useLocalSearchParams: () => mockSearchParams,
  // Mock cả static router nếu cần
  router: {
    back: mockBack,
    push: mockPush,
  },
}));

// --- Mock Calendar Services ---
jest.mock('@/app/services/calendarActions', () => ({
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('@/app/services/localCalendarService', () => ({
  syncLocalEventsWithBackend: jest.fn(),
}));

// --- Mock DateTimePicker ---
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return (props: any) => {
    return (
      <View
        // Gán testID dựa vào mode để dễ tìm: 'mock-date-picker' hoặc 'mock-time-picker'
        testID={props.mode === 'date' ? 'mock-date-picker' : 'mock-time-picker'}
        // Lưu hàm onChange vào props giả để gọi từ test
        // @ts-ignore
        onChangeMock={(event: any, date: Date) => props.onChange && props.onChange(event, date)}
      />
    );
  };
});

// --- Mock Icons ---
jest.mock('lucide-react-native', () => ({
  Calendar: () => 'CalendarIcon',
  Clock: () => 'ClockIcon',
}));

/* ========================================================================== */
/* 2. TEST SUITE                                                              */
/* ========================================================================== */

describe('AddEventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {}; 
    // Giả lập iOS để Picker luôn hiện (giúp test dễ hơn logic ẩn/hiện của Android)
    Platform.OS = 'ios'; 
  });

  /* ------------------------------------------------------------------------ */
  /* TEST RENDERING                                                           */
  /* ------------------------------------------------------------------------ */

  it('renders correctly in ADD mode', () => {
    mockSearchParams = { mode: 'add' };
    const { getByText, getByPlaceholderText, queryByText } = render(<AddEventScreen />);

    expect(getByText('Add new event')).toBeTruthy();
    expect(getByPlaceholderText('Math, Physics...')).toBeTruthy();
    expect(getByText('SAVE EVENT')).toBeTruthy();
    expect(queryByText('DELETE EVENT')).toBeNull();
  });

  it('renders correctly in EDIT mode with pre-filled data', () => {
    const mockEvent = {
      id: '1',
      title: 'Existing Event',
      startDate: new Date('2024-01-01T10:00:00.000Z').toISOString(),
      endDate: new Date('2024-01-01T11:00:00.000Z').toISOString(),
      source: 'LOCAL',
      repeat: { frequency: 'WEEKLY', interval: 1 },
    };

    mockSearchParams = {
      mode: 'edit',
      event: JSON.stringify(mockEvent),
    };

    const { getByText, getByDisplayValue } = render(<AddEventScreen />);

    expect(getByText('Edit event')).toBeTruthy();
    expect(getByDisplayValue('Existing Event')).toBeTruthy();
    expect(getByText('UPDATE EVENT')).toBeTruthy();
    expect(getByText('DELETE EVENT')).toBeTruthy();
    expect(getByText('Weekly')).toBeTruthy();
  });

  /* ------------------------------------------------------------------------ */
  /* TEST VALIDATION (Sửa lỗi Date Time ở đây)                                */
  /* ------------------------------------------------------------------------ */

  it('shows alert if title is missing', async () => {
    const spyAlert = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<AddEventScreen />);

    // Bọc trong act để đảm bảo mọi event loop hoàn tất
    await act(async () => {
        fireEvent.press(getByText('SAVE EVENT'));
    });

    expect(spyAlert).toHaveBeenCalledWith('Missing Info', 'Please enter event name');
    expect(CalendarActions.createEvent).not.toHaveBeenCalled();
  });

  it('shows alert if end time is before start time', async () => {
    const spyAlert = jest.spyOn(Alert, 'alert');
    const { getByText, getByPlaceholderText, getAllByTestId } = render(<AddEventScreen />);

    // 1. Nhập title
    fireEvent.changeText(getByPlaceholderText('Math, Physics...'), 'My Event');

    // 2. Lấy Mock Picker
    // getAllByTestId('mock-time-picker') sẽ trả về 2 phần tử: [StartPicker, EndPicker]
    const timePickers = getAllByTestId('mock-time-picker');
    const startTimePicker = timePickers[0];
    const endTimePicker = timePickers[1];

    // [FIX]: Dùng act để đảm bảo state React được cập nhật
    await act(async () => {
        // Set Start Time: 10:00
        const start = new Date();
        start.setHours(10, 0, 0, 0);
        // @ts-ignore
        startTimePicker.props.onChangeMock({ type: 'set' }, start);

        // Set End Time: 09:00 (Sai logic -> Phải báo lỗi)
        const end = new Date();
        end.setHours(9, 0, 0, 0);
        // @ts-ignore
        endTimePicker.props.onChangeMock({ type: 'set' }, end);
    });

    // 3. Save
    await act(async () => {
        fireEvent.press(getByText('SAVE EVENT'));
    });

    expect(spyAlert).toHaveBeenCalledWith('Invalid Time', 'End time must be after start time');
    expect(CalendarActions.createEvent).not.toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------ */
  /* TEST CREATE EVENT                                                        */
  /* ------------------------------------------------------------------------ */

  it('calls createEvent and syncs on successful save', async () => {
    const { getByText, getByPlaceholderText } = render(<AddEventScreen />);

    // Nhập Title
    fireEvent.changeText(getByPlaceholderText('Math, Physics...'), 'New Class');

    // Chọn Repeat Daily
    fireEvent.press(getByText('Daily'));

    // Save
    await act(async () => {
      fireEvent.press(getByText('SAVE EVENT'));
    });

    // Verify
    expect(CalendarActions.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Class',
        repeat: { frequency: 'DAILY', interval: 1 },
      }),
      'LOCAL'
    );
    expect(LocalCalendarService.syncLocalEventsWithBackend).toHaveBeenCalled();
    // [FIX]: Kiểm tra mockBack (biến global) thay vì router.back
    expect(mockBack).toHaveBeenCalled(); 
  });

  /* ------------------------------------------------------------------------ */
  /* TEST UPDATE EVENT                                                        */
  /* ------------------------------------------------------------------------ */

  it('calls updateEvent and syncs on successful update', async () => {
    const originalEvent = {
      id: '123',
      title: 'Old Title',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      source: 'LOCAL',
    };

    mockSearchParams = {
      mode: 'edit',
      event: JSON.stringify(originalEvent),
    };

    const { getByText, getByDisplayValue } = render(<AddEventScreen />);

    // Đổi Title
    fireEvent.changeText(getByDisplayValue('Old Title'), 'Updated Title');

    // Update
    await act(async () => {
      fireEvent.press(getByText('UPDATE EVENT'));
    });

    // Verify
    expect(CalendarActions.updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: '123' }),
      expect.objectContaining({ title: 'Updated Title' })
    );
    expect(LocalCalendarService.syncLocalEventsWithBackend).toHaveBeenCalled();
    // [FIX]: Kiểm tra mockBack
    expect(mockBack).toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------ */
  /* TEST DELETE EVENT                                                        */
  /* ------------------------------------------------------------------------ */

  it('calls deleteEvent after confirming alert', async () => {
    const originalEvent = {
      id: '999',
      title: 'To Delete',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      source: 'LOCAL',
    };

    mockSearchParams = {
      mode: 'edit',
      event: JSON.stringify(originalEvent),
    };

    const spyAlert = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<AddEventScreen />);

    // Bấm nút Delete
    fireEvent.press(getByText('DELETE EVENT'));

    // Lấy nút "Delete" trong Alert và bấm nó
    const buttons = spyAlert.mock.calls[0][2] as any[];
    const deleteButton = buttons.find((btn) => btn.text === 'Delete');
    
    await act(async () => {
      if (deleteButton && deleteButton.onPress) {
        await deleteButton.onPress();
      }
    });

    // Verify
    expect(CalendarActions.deleteEvent).toHaveBeenCalledWith(expect.objectContaining({ id: '999' }));
    expect(LocalCalendarService.syncLocalEventsWithBackend).toHaveBeenCalled();
    // [FIX]: Kiểm tra mockBack
    expect(mockBack).toHaveBeenCalled();
  });

  it('does NOT delete if alert is cancelled', async () => {
    const originalEvent = { id: '999', title: 'To Delete', startDate: '', endDate: '', source: 'LOCAL' };
    mockSearchParams = { mode: 'edit', event: JSON.stringify(originalEvent) };
    
    jest.spyOn(Alert, 'alert');
    const { getByText } = render(<AddEventScreen />);

    fireEvent.press(getByText('DELETE EVENT'));

    // Không bấm gì thêm (tương đương cancel)
    expect(CalendarActions.deleteEvent).not.toHaveBeenCalled();
  });
});