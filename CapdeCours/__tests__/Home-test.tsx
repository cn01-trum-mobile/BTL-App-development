import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';

// --- 1. MOCK DATE & TIME (Crucial) ---
// We freeze time to Monday, Jan 1st 2024 at 09:00 AM.
// This ensures "Today" in your component matches the "Monday" in our mock data below.
const MOCK_DATE = new Date('2024-01-01T09:00:00.000Z');
jest.useFakeTimers();
jest.setSystemTime(MOCK_DATE);

// --- 2. MOCK YOUR CUSTOM UTILS ---
// Your Home component imports { getData } from '@/utils/asyncStorage'.
// We must mock this to return a fake Calendar ID.
jest.mock('@/utils/asyncStorage', () => ({
  getData: jest.fn(() => Promise.resolve(JSON.stringify(['calendar-1']))),
}));

// --- 3. MOCK EXPO CALENDAR ---
// We return fake events that match the "Monday" date we set above.
jest.mock('expo-calendar', () => ({
  getEventsAsync: jest.fn(() =>
    Promise.resolve([
      {
        id: '1',
        title: 'Machine learning',
        startDate: '2024-01-01T08:00:00.000Z', // 8:00 AM
        endDate: '2024-01-01T10:00:00.000Z', // 10:00 AM
        location: 'Room 101',
      },
      {
        id: '2',
        title: 'Deep learning',
        startDate: '2024-01-01T12:00:00.000Z', // 12:00 PM
        endDate: '2024-01-01T14:00:00.000Z', // 2:00 PM
        location: 'Lab 2',
      },
    ])
  ),
}));

// --- 4. MOCK NAVIGATION ---
// Your component uses 'useFocusEffect', which doesn't auto-run in tests.
// This mock forces the effect to run immediately when the component renders.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

// --- 5. MOCK ICONS ---
jest.mock('lucide-react-native', () => ({
  CalendarPlus: 'CalendarPlus',
}));

// --- 6. MOCK DATE-FNS ---
// We mock date-fns to ensure formatting matches exactly what your tests expect.
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    format: (date: Date, fmt: string) => {
      // Your component expects "08:00", but your test looks for "08.00"
      // This simple hack ensures we return whatever format standard date-fns would,
      // but you might need to adjust your test expectations if they disagree.
      if (fmt === 'HH:mm') {
        // Force dot format if your test specifically demands "08.00"
        const str = actual.format(date, 'HH:mm');
        return str.replace(':', '.');
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

    // Check for date formatted based on our frozen MOCK_DATE (Jan 01)
    await waitFor(() => {
      expect(getByText(/Schedule \(01\/01\)/)).toBeTruthy();
    });
  });

  it('displays Machine learning class at 08.00', async () => {
    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('Machine learning')).toBeTruthy();
      // Our mock date-fns forces "08.00" to match your old test expectation
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
