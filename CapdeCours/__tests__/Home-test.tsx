import React from 'react';
import { render } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';

// --- Mock Navigation ---
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(() => {}),
}));

// --- Mock AsyncStorage ---
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// --- Mock Calendar API ---
jest.mock('expo-calendar', () => ({
  getEventsAsync: jest.fn(() => Promise.resolve([])),
  getCalendarsAsync: jest.fn(() => Promise.resolve([])),
  requestCalendarPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
}));

// --- Mock Icons (bản sửa đúng cách) ---
jest.mock('lucide-react-native', () => {
  const { Text } = require('react-native');
  return {
    CalendarPlus: () => <Text>CalendarPlus</Text>,
  };
});

// --- Mock date-fns ---
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Jan 2024'),
  startOfWeek: jest.fn(() => new Date(2024, 0, 1)),
  addDays: jest.fn((_, n) => new Date(2024, 0, 1 + n)),
  isSameDay: jest.fn(() => false),
}));

describe('Home Screen (Static UI)', () => {
  it('renders welcome message', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Welcome back!')).toBeTruthy();
  });

  it('renders month-year text at least once', () => {
    const { getAllByText } = render(<Home />);
    expect(getAllByText('Jan 2024').length).toBeGreaterThan(0);
  });

  it('renders banner text', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Classify unorganized images now!')).toBeTruthy();
  });

  it('renders CalendarPlus icon text', () => {
    const { getByText } = render(<Home />);
    expect(getByText('CalendarPlus')).toBeTruthy();
  });

  it('renders at least 2 images', () => {
    const { UNSAFE_root } = render(<Home />);
    const imgs = UNSAFE_root.findAllByType('Image');
    expect(imgs.length).toBeGreaterThanOrEqual(2);
  });
});
