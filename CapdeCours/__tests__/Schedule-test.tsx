import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Schedule from '../app/(main layout)/schedule/index';

// --- MOCKS ---

// 1. Mock Router
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// 2. Mock Navigation Focus (để loadEvents chạy)
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => cb(),
}));

// 3. Mock Icon (Fix lỗi lucide crash)
jest.mock('lucide-react-native', () => ({
  Info: (props: any) => <>{'InfoIcon'}</>,
  CalendarPlus: (props: any) => <>{'CalendarPlusIcon'}</>,
}));

// 4. Mock Data Hook
const mockLoadEvents = jest.fn();
let mockEvents = [] as any;
let mockLoading = false;

jest.mock('@/app/services/useUnifiedCalendar', () => ({
  useUnifiedCalendar: () => ({
    events: mockEvents,
    loading: mockLoading,
    loadEvents: mockLoadEvents,
  }),
}));

describe('Schedule Screen Coverage', () => {
  beforeEach(() => {
    jest.useFakeTimers(); // Dùng fake timer để test setTimeout trong useEffect
    mockPush.mockClear();
    mockLoadEvents.mockClear();
    
    // Setup dữ liệu giả để cover các nhánh màu sắc (Branch Coverage)
    const today = new Date();
    today.setHours(8, 0, 0, 0); // 8:00 AM

    mockEvents = [
      {
        id: '1',
        title: 'Local Event',
        startDate: today.toISOString(),
        endDate: new Date(today.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour
        source: 'LOCAL', // Cover nhánh màu #AC3C00
      },
      {
        id: '2',
        title: 'Remote Event',
        startDate: new Date(today.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 10:00 AM
        endDate: new Date(today.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        source: 'REMOTE', // Cover nhánh màu #42160dbf
      },
      {
        id: '3',
        title: 'Other Event',
        startDate: new Date(today.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 12:00 PM
        endDate: new Date(today.getTime() + 5 * 60 * 60 * 1000).toISOString(),
        source: 'OTHER', // Cover nhánh màu #A44063 (else)
      },
      {
        id: '4',
        title: 'Hidden Event', // Event này trước 0h sáng (theo logic code START_HOUR=0 thì luôn hiện, nhưng nếu code có logic filter thì add vào)
        startDate: new Date(today.setHours(-1)).toISOString(), 
        endDate: new Date(today.setHours(0)).toISOString(),
        source: 'LOCAL',
      }
    ];
    mockLoading = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly and handles initial scroll', async () => {
    const { getByText } = render(<Schedule />);

    // Trigger timer để chạy logic scrollToWeek trong useEffect
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(getByText('Schedule')).toBeTruthy();
      expect(getByText('Local Event')).toBeTruthy();
    });
  });

  it('renders loading state', () => {
    mockLoading = true;
    const { getByTestId, UNSAFE_getByType } = render(<Schedule />);
    // Tìm ActivityIndicator
    const indicator = UNSAFE_getByType(require('react-native').ActivityIndicator);
    expect(indicator).toBeTruthy();
  });

  it('handles week scrolling (Day Selection Logic)', async () => {
    const { getByText, getAllByText } = render(<Schedule />);
    
    // Tìm một ngày trong tuần (ví dụ hiển thị ngày hiện tại)
    // Code hiển thị format(day, 'd') -> Tìm số ngày
    const todayNum = new Date().getDate().toString();
    const dayElements = getAllByText(todayNum); 
    expect(dayElements.length).toBeGreaterThan(0);

    // Simulate press vào ngày để đổi selectedDate
    fireEvent.press(dayElements[0]);
    
    // Kiểm tra loadEvents được gọi lại khi đổi ngày
    await waitFor(() => {
      expect(mockLoadEvents).toHaveBeenCalled();
    });
  });

  it('navigates to edit event when clicking on an event block', async () => {
    const { getByText } = render(<Schedule />);
    
    await waitFor(() => expect(getByText('Local Event')).toBeTruthy());
    
    const eventBlock = getByText('Local Event');
    fireEvent.press(eventBlock);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(main layout)/schedule/addEvent',
      params: {
        mode: 'edit',
        event: expect.stringContaining('"title":"Local Event"'),
      },
    });
  });
});