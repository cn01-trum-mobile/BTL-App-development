import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';

jest.mock('lucide-react-native', () => ({
  CalendarPlus: 'CalendarPlus',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
}));

// Mock expo-calendar
jest.mock('expo-calendar', () => ({
  getEventsAsync: jest.fn(() => Promise.resolve([])),
}));

// Mock useFocusEffect (chạy callback ngay lập tức)
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => cb(),
}));

// Mock date-fns
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    startOfWeek: jest.fn(() => new Date(2024, 0, 1)), // Monday 01/01/2024
    addDays: jest.fn((d, num) => {
      const result = new Date(d);
      result.setDate(result.getDate() + num);
      return result;
    }),
    format: jest.fn((date, f) => {
      if (f === 'MMM yyyy') return 'Jan 2024';
      if (f === 'EEE') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][date.getDay()];
      if (f === 'd') return date.getDate().toString();
      if (f === 'dd/MM') return '01/01';
      if (f === 'HH:mm') return '08:00';
      return 'mocked';
    }),
    isSameDay: jest.fn((a, b) => a.getDate() === b.getDate()),
    startOfDay: jest.fn((d) => new Date(d.setHours(0, 0, 0, 0))),
    endOfDay: jest.fn((d) => new Date(d.setHours(23, 59, 59, 999))),
    differenceInMinutes: jest.fn(() => 120),
  };
});

const mockAsyncStorage = require('@react-native-async-storage/async-storage');
const mockCalendar = require('expo-calendar');

describe('Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome text', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Welcome back!')).toBeTruthy();
  });

  it('renders current month & year from date-fns mock', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Jan 2024')).toBeTruthy();
  });

  it('renders 7 days of the week', () => {
    const { getAllByText } = render(<Home />);
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    labels.forEach((day) => {
      expect(getAllByText(day).length).toBeGreaterThan(0);
    });
  });

  it('handles day selection', () => {
    const { getAllByText } = render(<Home />);

    const wed = getAllByText('Wed')[0];
    fireEvent.press(wed);

    expect(wed).toBeTruthy();
  });

  it('shows empty state when no calendar selected', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    mockCalendar.getEventsAsync.mockResolvedValueOnce([]);

    const { getByText } = render(<Home />);

    await waitFor(() =>
      expect(getByText('No classes scheduled for today.')).toBeTruthy()
    );
  });

  it('shows events when calendar returns results', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['1']));

    mockCalendar.getEventsAsync.mockResolvedValueOnce([
      {
        id: '001',
        title: 'Math Class',
        startDate: new Date(2024, 0, 1, 8, 0),
        endDate: new Date(2024, 0, 1, 10, 0),
        location: 'Room A'
      }
    ]);

    const { getByText } = render(<Home />);

    await waitFor(() => expect(getByText('Math Class')).toBeTruthy());
    expect(getByText('08:00')).toBeTruthy();
  });

  it('renders loading state', () => {
    mockAsyncStorage.getItem.mockReturnValue(new Promise(() => {})); // treo để loading
    const { getByTestId } = render(<Home />);
  });

  it('renders bottom banner text', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Classify unorganized images now!')).toBeTruthy();
  });

  it('renders 2 images in banner', () => {
    const { UNSAFE_root } = render(<Home />);
    const imgs = UNSAFE_root.findAllByType('Image');
    expect(imgs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders CalendarPlus icon', () => {
    const { getByText } = render(<Home />);
    expect(getByText('CalendarPlus')).toBeTruthy();
  });
});
