import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';

// --- 1. MOCK DATE & TIME ---
const MOCK_DATE = new Date('2024-01-01T09:00:00.000Z');
jest.useFakeTimers();
jest.setSystemTime(MOCK_DATE);

// --- 2. MOCK YOUR CUSTOM UTILS ---
jest.mock('@/utils/asyncStorage', () => ({
  getData: jest.fn(() => Promise.resolve(JSON.stringify(['calendar-1']))),
}));

// --- 3. MOCK EXPO CALENDAR ---
jest.mock('expo-calendar', () => ({
  getEventsAsync: jest.fn(() =>
    Promise.resolve([
      {
        id: '1',
        title: 'Machine learning',
        startDate: '2024-01-01T08:00:00.000Z',
        endDate: '2024-01-01T10:00:00.000Z',
        location: 'Room 101',
      },
      {
        id: '2',
        title: 'Deep learning',
        startDate: '2024-01-01T12:00:00.000Z',
        endDate: '2024-01-01T14:00:00.000Z',
        location: 'Lab 2',
      },
    ])
  ),
}));

// --- 4. MOCK NAVIGATION (FIXED HERE) ---
// We use React.useEffect so the callback runs AFTER mount, not DURING render.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    React.useEffect(callback, []);
  },
}));

// --- 5. MOCK ICONS ---
jest.mock('lucide-react-native', () => ({
  CalendarPlus: 'CalendarPlus',
}));

// --- 6. MOCK DATE-FNS ---
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    format: (date: Date, fmt: string) => {
      if (fmt === 'HH:mm') {
        // Force dot format if your test demands "08.00"
        const d = new Date(date);
        // Ensure we get UTC hours since we set system time to UTC
        const hours = d.getUTCHours().toString().padStart(2, '0');
        return `${hours}.00`;
      }
      return actual.format(date, fmt);
    },
  };
});

describe('Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with welcome message', async () => {
    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('Welcome back!')).toBeTruthy();
    });
  });

  it('displays today schedule section', async () => {
    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText(/Schedule \(01\/01\)/)).toBeTruthy();
    });
  });

  it('displays Machine learning class at 08.00', async () => {
    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('Machine learning')).toBeTruthy();
      expect(getByText('08.00')).toBeTruthy();
    });
  });

  it('displays Deep learning class at 12.00', async () => {
    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('Deep learning')).toBeTruthy();
      expect(getByText('12.00')).toBeTruthy();
    });
  });

  it('renders bottom section with call-to-action text', async () => {
    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('Classify unorganized images now!')).toBeTruthy();
    });
  });

  it('renders images in bottom section', async () => {
    const { UNSAFE_root } = render(<Home />);

    await waitFor(() => {
      const images = UNSAFE_root.findAllByType('Image');
      expect(images.length).toBeGreaterThanOrEqual(2);
    });
  });
});
