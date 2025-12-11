import React from 'react';
import { render } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock expo-calendar (native)
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCalendarsAsync: jest.fn(() => Promise.resolve([])),
}));

// Mock icon
jest.mock('lucide-react-native', () => ({
  CalendarPlus: 'CalendarPlus',
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'Jan 2024'),
  startOfWeek: jest.fn(() => new Date(2024, 0, 1)), // Monday
  addDays: jest.fn((d, n) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }),
  isSameDay: jest.fn(() => false),
}));

describe('Home Screen (static UI)', () => {
  it('renders welcome text', () => {
    const { getByText } = render(<Home />);
    expect(getByText('Welcome back!')).toBeTruthy();
  });

  it('renders month-year', () => {
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

  it('renders at least 2 images in banner', () => {
    const { UNSAFE_root } = render(<Home />);
    const imgs = UNSAFE_root.findAllByType('Image');
    expect(imgs.length).toBeGreaterThanOrEqual(2);
  });

  it('renders weekday labels', () => {
    const { getByText } = render(<Home />);

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    labels.forEach((d) => {
      expect(getByText(d)).toBeTruthy();
    });
  });

  it('renders schedule title', () => {
    const { getByText } = render(<Home />);
    expect(getByText(/Schedule/i)).toBeTruthy();
  });
});
