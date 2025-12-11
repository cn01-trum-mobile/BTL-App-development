import React from 'react';
import { render } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';

// --- Mock Navigation (ngăn side-effect focus) ---
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(() => {}), // disable side-effect
}));

// --- Mock AsyncStorage (ngăn fetchEvents chạy thật) ---
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// --- Mock Calendar API (tránh gọi native) ---
jest.mock('expo-calendar', () => ({
  getEventsAsync: jest.fn(() => Promise.resolve([])),
  getCalendarsAsync: jest.fn(() => Promise.resolve([])),
  requestCalendarPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
}));

// --- Mock Icons ---
jest.mock('lucide-react-native', () => ({
  CalendarPlus: 'CalendarPlus',
}));

// --- Mock date-fns để tránh lệch giờ ---
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Jan 2024'),
  startOfWeek: jest.fn(() => new Date(2024, 0, 1)),
  addDays: jest.fn((d, n) => new Date(2024, 0, 1 + n)),
  isSameDay: jest.fn(() => false),
}));

// --- Mock toàn bộ fetchEvents nếu component gọi trực tiếp (bảo hiểm) ---
jest.spyOn(global, 'setTimeout').mockImplementation((cb) => {
  cb(); // chạy ngay, tránh async
  return 0;
});

describe('Home Screen (Static UI)', () => {
  it('renders welcome message', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Welcome back!')).toBeTruthy();
  });

  it('renders month-year text', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Jan 2024')).toBeTruthy();
  });

  it('renders banner text', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Classify unorganized images now!')).toBeTruthy();
  });

  it('renders CalendarPlus icon', () => {
    const { getByText } = render(<Home />);
    expect(getByText('CalendarPlus')).toBeTruthy();
  });

  it('renders at least 2 images', () => {
    const { UNSAFE_root } = render(<Home />);
    const imgs = UNSAFE_root.findAllByType('Image');
    expect(imgs.length).toBeGreaterThanOrEqual(2);
  });
});
