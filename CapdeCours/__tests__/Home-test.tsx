import React from 'react';
import { render } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';

// Mock navigation (fix lỗi NavigationContainer)
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(cb => cb()), // chạy callback ngay lập tức, không cần navigation
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock Calendar
jest.mock('expo-calendar', () => ({
  getEventsAsync: jest.fn(() => Promise.resolve([])),
}));

// Mock icons
jest.mock('lucide-react-native', () => ({
  CalendarPlus: 'CalendarPlus',
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Jan 2024'),
  startOfWeek: jest.fn(() => new Date(2024, 0, 1)),
  addDays: jest.fn((d, n) => new Date(2024, 0, 1 + n)),
  isSameDay: jest.fn(() => false),
}));

describe('Home Screen (Simple UI Test)', () => {
  it('renders welcome message', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Welcome back!')).toBeTruthy();
  });

  it('renders month-year header', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Jan 2024')).toBeTruthy();
  });

  it('renders schedule title', () => {
    const { getByText } = render(<Home />);
    expect(getByText(/Schedule/i)).toBeTruthy();
  });

  it('renders banner text', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Classify unorganized images now!')).toBeTruthy();
  });

  it('renders CalendarPlus icon', () => {
    const { getByText } = render(<Home />);
    expect(getByText('CalendarPlus')).toBeTruthy();
  });

  it('renders at least 2 images in banner', () => {
    const { UNSAFE_root } = render(<Home />);
    const imgs = UNSAFE_root.findAllByType('Image');
    expect(imgs.length).toBeGreaterThanOrEqual(2);
  });
});
