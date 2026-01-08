import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CalendarSelectScreen from '../app/(main layout)/login/chooseCalendar'; // Adjust path as needed
import * as Calendar from 'expo-calendar';
import { Alert } from 'react-native';
import { getData, storeData } from '@/utils/asyncStorage';

// --- 1. MOCKS ---

// Mock Expo Calendar
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  EntityTypes: { EVENT: 'event' },
}));

// Mock AsyncStorage
jest.mock('@/utils/asyncStorage', () => ({
  getData: jest.fn(),
  storeData: jest.fn(),
}));

// Mock Ionicons (to prevent rendering errors)
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Navigation
const mockNavigation = { navigate: jest.fn() };

describe('CalendarSelectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default spy on Alert
    jest.spyOn(Alert, 'alert');
  });

  // --- PERMISSIONS TESTS ---

  it('shows an alert if calendar permission is denied', async () => {
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    render(<CalendarSelectScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(Calendar.requestCalendarPermissionsAsync).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Cần quyền truy cập', 'Ứng dụng cần quyền đọc lịch để hoạt động.');
    });
  });

  // --- FILTERING & RENDERING TESTS ---

  it('fetches calendars and filters them correctly (Android & iOS logic)', async () => {
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (getData as jest.Mock).mockResolvedValue(null);

    // Mock Data based on your filter logic:
    // 1. Android Google Account (Should PASS)
    // 2. iOS Gmail CalDAV (Should PASS)
    // 3. Local/System Calendar (Should FAIL/FILTER OUT)
    const mockCalendars = [
      {
        id: '1',
        title: 'Work Android',
        source: { type: 'com.google', name: 'user@gmail.com' },
      },
      {
        id: '2',
        title: 'Work iOS',
        source: { type: 'caldav', name: 'gmail' },
        allowsModifications: true,
      },
      {
        id: '3',
        title: 'Useless Local',
        source: { type: 'LOCAL', name: 'phone' },
      },
    ];

    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue(mockCalendars);

    const { getByText, queryByText } = render(<CalendarSelectScreen navigation={mockNavigation} />);

    await waitFor(() => {
      // Expect Loading to finish
      expect(queryByText('Useless Local')).toBeNull(); // Should be filtered out
      expect(getByText('Work Android')).toBeTruthy(); // Should exist
      expect(getByText('Work iOS')).toBeTruthy(); // Should exist
    });
  });

  it('renders empty state if no matching calendars found', async () => {
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (getData as jest.Mock).mockResolvedValue(null);
    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([]);

    const { getByText } = render(<CalendarSelectScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('There is no available schedule.')).toBeTruthy();
    });
  });

  // --- STATE RESTORATION TESTS ---

  it('re-hydrates previously saved selection', async () => {
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

    const mockCalendars = [{ id: '100', title: 'My Calendar', source: { type: 'com.google' } }];
    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue(mockCalendars);

    // Simulate ID '100' was previously saved
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(['100']));

    const { getByText } = render(<CalendarSelectScreen navigation={mockNavigation} />);

    await waitFor(() => {
      // Check if button count reflects the saved item
      expect(getByText('CONTINUE (1)')).toBeTruthy();
    });
  });

  // --- INTERACTION & SAVING TESTS ---

  it('toggles selection and saves successfully', async () => {
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (getData as jest.Mock).mockResolvedValue(null);

    const mockCalendars = [
      { id: 'A', title: 'Calendar A', source: { type: 'com.google' } },
      { id: 'B', title: 'Calendar B', source: { type: 'com.google' } },
    ];
    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue(mockCalendars);

    const { getByText } = render(<CalendarSelectScreen navigation={mockNavigation} />);

    // Wait for list to load
    await waitFor(() => expect(getByText('Calendar A')).toBeTruthy());

    // 1. Initial State: 0 selected
    expect(getByText('CONTINUE (0)')).toBeTruthy();

    // 2. Select 'Calendar A'
    fireEvent.press(getByText('Calendar A'));
    expect(getByText('CONTINUE (1)')).toBeTruthy();

    // 3. Select 'Calendar B'
    fireEvent.press(getByText('Calendar B'));
    expect(getByText('CONTINUE (2)')).toBeTruthy();

    // 4. Deselect 'Calendar A'
    fireEvent.press(getByText('Calendar A'));
    expect(getByText('CONTINUE (1)')).toBeTruthy();

    // 5. Press Continue
    fireEvent.press(getByText(/CONTINUE/));

    // 6. Verify Save
    await waitFor(() => {
      // Should save 'B' (since A was deselected)
      expect(storeData).toHaveBeenCalledWith('USER_CALENDAR_IDS', JSON.stringify(['B']));
      expect(Alert.alert).toHaveBeenCalledWith('Thành công', expect.stringContaining('Đã cập nhật 1 nguồn lịch'));
    });
  });

  it('disables save button action when nothing selected', async () => {
    (Calendar.requestCalendarPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (getData as jest.Mock).mockResolvedValue(null);
    (Calendar.getCalendarsAsync as jest.Mock).mockResolvedValue([{ id: 'A', title: 'A', source: { type: 'com.google' } }]);

    const { getByText } = render(<CalendarSelectScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('A')).toBeTruthy());

    // Press Continue while selection is 0
    fireEvent.press(getByText(/CONTINUE/));

    // Ensure storeData was NOT called
    expect(storeData).not.toHaveBeenCalled();
  });
});
