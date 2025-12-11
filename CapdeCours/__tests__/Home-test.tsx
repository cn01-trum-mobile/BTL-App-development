import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';

jest.mock('lucide-react-native', () => ({
  CalendarPlus: 'CalendarPlus',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('')), // tránh setState sớm
}));

jest.mock('expo-calendar', () => ({
  getEventsAsync: jest.fn(() => Promise.resolve([])),
}));

// Mock useFocusEffect chạy trong act()
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((cb) => {
    const { act } = require('@testing-library/react-native');
    act(() => cb());
  }),
}));

jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    startOfWeek: jest.fn(() => new Date(2024, 0, 1)),
    addDays: jest.fn((d, n) => {
      const r = new Date(d);
      r.setDate(r.getDate() + n);
      return r;
    }),
    isSameDay: jest.fn((a, b) => a.getDate() === b.getDate()),
    format: jest.fn((d, f) => {
      if (f === 'MMM yyyy') return 'Jan 2024';
      if (f === 'EEE')
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d.getDay()];
      if (f === 'd') return d.getDate().toString();
      if (f === 'dd/MM') return '01/01';
      if (f === 'HH:mm') return '08:00';
      return 'mocked';
    }),
    differenceInMinutes: jest.fn(() => 120),
    startOfDay: jest.fn((d) => new Date(d.setHours(0, 0, 0, 0))),
    endOfDay: jest.fn((d) => new Date(d.setHours(23, 59, 59, 999))),
  };
});

describe('Home Screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders welcome', async () => {
    const { getByText } = render(<Home />);
    await waitFor(() => expect(getByText('Welcome back!')).toBeTruthy());
  });

  it('renders month/year', async () => {
    const { getByText } = render(<Home />);
    await waitFor(() => expect(getByText('Jan 2024')).toBeTruthy());
  });

  it('renders all weekdays', async () => {
    const { getAllByText } = render(<Home />);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    await waitFor(() => {
      days.forEach((d) => expect(getAllByText(d).length).toBeGreaterThan(0));
    });
  });

  it('renders empty schedule when no events', async () => {
    const { getByText } = render(<Home />);

    await waitFor(() =>
      expect(
        getByText('No classes scheduled for today.')
      ).toBeTruthy()
    );
  });

  it('renders banner', async () => {
    const { getByText } = render(<Home />);
    await waitFor(() =>
      expect(getByText('Classify unorganized images now!')).toBeTruthy()
    );
  });

  it('renders images', async () => {
    const { UNSAFE_root } = render(<Home />);
    await waitFor(() => {
      const imgs = UNSAFE_root.findAllByType('Image');
      expect(imgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders CalendarPlus icon', async () => {
    const { getByText } = render(<Home />);
    await waitFor(() => expect(getByText('CalendarPlus')).toBeTruthy());
  });
});
