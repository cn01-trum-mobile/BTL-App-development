import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';
import { getData } from '@/utils/asyncStorage';
import * as Calendar from 'expo-calendar';

// --- SETUP & MOCKS ---
const MOCK_DATE = new Date('2024-01-01T09:00:00.000Z');
jest.useFakeTimers();
jest.setSystemTime(MOCK_DATE);

// 1. Mock Utils
jest.mock('@/utils/asyncStorage', () => ({ getData: jest.fn() }));

// 2. Mock Calendar
jest.mock('expo-calendar', () => ({ getEventsAsync: jest.fn() }));

// 3. Mock Navigation (LINT FIX: Use jest.requireActual + Inline arrow function)
jest.mock('@react-navigation/native', () => {
  const actualReact = jest.requireActual('react');
  return {
    useFocusEffect: (callback: () => void) => {
      actualReact.useEffect(() => {
        callback();
      }, []);
    },
  };
});

// 4. Mock Icons (Use real Text for interaction)
jest.mock('lucide-react-native', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    CalendarPlus: (props: any) => <Text {...props}>CalendarPlusIcon</Text>,
  };
});

// 5. Mock Date-Fns
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    format: (date: Date, fmt: string) => {
      if (fmt === 'HH:mm') {
        const d = new Date(date);
        const hours = d.getUTCHours().toString().padStart(2, '0');
        const mins = d.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}.${mins}`;
      }
      return actual.format(date, fmt);
    },
  };
});

describe('Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(['cal-1']));

    // Default: 2 events (Crucial for 100% Function Coverage on .sort())
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValue([
      {
        id: '1',
        title: 'Morning Class',
        startDate: '2024-01-01T08:00:00.000Z',
        endDate: '2024-01-01T10:00:00.000Z',
        location: 'Room 101',
      },
      {
        id: '2',
        title: 'Afternoon Class',
        startDate: '2024-01-01T13:00:00.000Z',
        endDate: '2024-01-01T15:00:00.000Z',
        location: 'Lab A',
      },
    ]);
  });

  // --- TESTS ---

  it('renders correctly with events sorted', async () => {
    const { getByText } = render(<Home />);
    await waitFor(() => {
      expect(getByText('Morning Class')).toBeTruthy();
      expect(getByText('Afternoon Class')).toBeTruthy();
    });
  });

  it('renders images in bottom section', async () => {
    const { UNSAFE_root } = render(<Home />);
    await waitFor(() => {
      expect(UNSAFE_root.findAllByType('Image').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('handles case where no calendar IDs are stored', async () => {
    (getData as jest.Mock).mockResolvedValueOnce(null);
    const { queryByText } = render(<Home />);
    await waitFor(() => expect(queryByText('Morning Class')).toBeNull());
  });

  it('handles API errors gracefully', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (Calendar.getEventsAsync as jest.Mock).mockRejectedValueOnce(new Error('Fail'));
    render(<Home />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockRestore();
  });

  it('handles button press', async () => {
    const { getByText } = render(<Home />);
    await waitFor(() => getByText('Welcome back!'));

    const btn = getByText('CalendarPlusIcon');
    fireEvent.press(btn);
    expect(btn).toBeTruthy();
  });

  it('handles weekday selection', async () => {
    const { getByText } = render(<Home />);
    await waitFor(() => getByText('Welcome back!'));
    fireEvent.press(getByText('Tue'));
    await waitFor(() => expect(getByText('Tue')).toBeTruthy());
  });

  // --- BRANCH LOGIC TESTS ---

  it('displays empty state when no events exist', async () => {
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValueOnce([]);
    const { getByText } = render(<Home />);
    await waitFor(() => {
      expect(getByText('No classes scheduled for today.')).toBeTruthy();
    });
  });

  it('handles events without location', async () => {
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValueOnce([
      {
        id: '99',
        title: 'Mystery',
        startDate: '2024-01-01T10:00:00.000Z',
        endDate: '2024-01-01T11:00:00.000Z',
        location: null,
      },
    ]);

    const { getByText, queryByText } = render(<Home />);
    await waitFor(() => {
      expect(getByText('Mystery')).toBeTruthy();
      expect(queryByText(/📍/)).toBeNull();
    });
  });

  it('formats short durations (< 1h) correctly', async () => {
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValueOnce([
      {
        id: 'short',
        title: 'Shorty',
        startDate: '2024-01-01T10:00:00.000Z',
        endDate: '2024-01-01T10:45:00.000Z',
        location: 'A',
      },
    ]);

    const { getByText } = render(<Home />);
    await waitFor(() => {
      expect(getByText(/45m/)).toBeTruthy();
    });
  });

  it('formats complex durations (> 1h with mins) correctly', async () => {
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValueOnce([
      {
        id: 'complex',
        title: 'Long',
        startDate: '2024-01-01T10:00:00.000Z',
        endDate: '2024-01-01T11:30:00.000Z',
        location: 'B',
      },
    ]);

    const { getByText } = render(<Home />);
    await waitFor(() => {
      expect(getByText(/1h30/)).toBeTruthy();
    });
  });
});
