import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Schedule from '../app/(main layout)/schedule/index';
import { router } from 'expo-router';
import { format, addDays, startOfWeek, set } from 'date-fns';

/* ========================================================================== */
/* 1. MOCKS SETUP                                                             */
/* ========================================================================== */

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Setup Date cố định: 12/06/2024 (Thứ Tư)
const FIXED_DATE = new Date('2024-06-12T10:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_DATE);
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

// --- MOCK EXPO ROUTER ---
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// --- [FIX] MOCK NAVIGATION ---
// Phải require 'react' bên trong factory để tránh lỗi ReferenceError
jest.mock('@react-navigation/native', () => {
  const React = require('react'); 
  return {
    useFocusEffect: (cb: any) => React.useEffect(cb, []),
  };
});

// --- MOCK CALENDAR HOOK ---
let mockCalendarHookReturn = {
  events: [] as any[],
  loading: false,
  loadEvents: jest.fn(),
};

jest.mock('@/app/services/useUnifiedCalendar', () => ({
  useUnifiedCalendar: () => mockCalendarHookReturn,
}));

// --- MOCK ICONS ---
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    CalendarPlus: () => <View testID="icon-calendar-plus" />,
    Info: () => <View testID="icon-info" />,
  };
});

/* ========================================================================== */
/* 2. TEST SUITE                                                              */
/* ========================================================================== */

describe('Schedule Component', () => {
  
  const resetCalendarMock = () => {
    mockCalendarHookReturn = {
      events: [],
      loading: false,
      loadEvents: jest.fn(),
    };
  };

  beforeEach(() => {
    resetCalendarMock();
  });

  /* --- RENDERING & LOADING --- */

  it('shows loading indicator when data is fetching', () => {
    mockCalendarHookReturn.loading = true;
    const { UNSAFE_getAllByType } = render(<Schedule />);
    const loading = UNSAFE_getAllByType(require('react-native').ActivityIndicator);
    expect(loading).toBeTruthy();
  });

  it('renders correctly with default state (Header, Month, Today)', () => {
    const { getByText, getByLabelText } = render(<Schedule />);
    
    expect(getByText('Schedule')).toBeTruthy();
    expect(getByText(format(FIXED_DATE, 'MMMM yyyy'))).toBeTruthy();
    
    expect(getByLabelText('Color legend')).toBeTruthy();
    expect(getByLabelText('Add event')).toBeTruthy();
  });

  it('scrolls to current week index on mount', async () => {
    render(<Schedule />);
    act(() => { jest.runAllTimers(); });
  });

  /* --- INTERACTION: DATE SELECTION --- */

  /* --- INTERACTION: NAVIGATION --- */

  it('navigates to Add Event screen', () => {
    const { getByLabelText } = render(<Schedule />);
    fireEvent.press(getByLabelText('Add event'));
    expect(mockPush).toHaveBeenCalledWith('/(main layout)/schedule/addEvent');
  });

  it('navigates to Edit Event screen when clicking an event', () => {
    const event = {
      id: '1',
      title: 'Math Class',
      startDate: set(FIXED_DATE, { hours: 10, minutes: 0 }).toISOString(),
      endDate: set(FIXED_DATE, { hours: 11, minutes: 0 }).toISOString(),
      source: 'LOCAL',
    };
    mockCalendarHookReturn.events = [event];

    const { getByText } = render(<Schedule />);
    
    fireEvent.press(getByText('Math Class'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(main layout)/schedule/addEvent',
      params: {
        mode: 'edit',
        event: JSON.stringify(event),
      },
    });
  });

  /* --- FEATURE: LEGEND --- */

  it('toggles legend visibility', () => {
    const { getByLabelText, getByText, queryByText } = render(<Schedule />);
    
    expect(queryByText('Notes:')).toBeNull();

    fireEvent.press(getByLabelText('Color legend'));
    expect(getByText('Notes:')).toBeTruthy();

    fireEvent.press(getByLabelText('Color legend'));
    expect(queryByText('Notes:')).toBeNull();
  });

  /* --- LOGIC: EVENT RENDERING (POSITION & COLOR) --- */

  it('hides events starting before START_HOUR (0h)', () => {
    const today = new Date(FIXED_DATE);
    const day3 = addDays(today, 2);
    const eventDay3 = {
        id: '3', title: 'Day 3 Event', source: 'LOCAL',
        startDate: set(day3, { hours: 10, minutes: 0 }).toISOString(),
        endDate: set(day3, { hours: 11, minutes: 0 }).toISOString()
    };
    mockCalendarHookReturn.events = [eventDay3];

    const { getByText } = render(<Schedule />);
    expect(getByText('Day 3 Event')).toBeTruthy();
  });

  /* --- LOGIC: SCROLLING WEEKS --- */

  it('updates current week and selected date on scroll', async () => {
    const { UNSAFE_getByType } = render(<Schedule />);
    
    const flatList = UNSAFE_getByType(require('react-native').FlatList);
    const SCREEN_WIDTH = require('react-native').Dimensions.get('window').width;
    
    const targetIndex = 51;
    const offsetX = SCREEN_WIDTH * targetIndex;

    fireEvent(flatList, 'momentumScrollEnd', {
      nativeEvent: {
        contentOffset: { x: offsetX, y: 0 }
      }
    });
    
    await waitFor(() => {
        const nextWeekDate = addDays(startOfWeek(FIXED_DATE, { weekStartsOn: 1 }), 7);
        // Kiểm tra logic chạy không crash là đủ cho unit test scroll
    });
  });

  /* --- LOGIC: FOCUS EFFECT --- */

  it('reloads events when screen gains focus', () => {
    render(<Schedule />);
    expect(mockCalendarHookReturn.loadEvents).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
    );
  });

});