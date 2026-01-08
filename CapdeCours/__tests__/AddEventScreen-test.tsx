import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AddEventScreen from '../app/(main layout)/schedule/addEvent'; // Sửa path
import { createEvent } from '@/app/services/calendarActions';

// 1. Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ mode: 'create' }), // Mặc định là mode create
}));

// 2. Mock Services (Quan trọng)
jest.mock('@/app/services/calendarActions', () => ({
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('@/app/services/localCalendarService', () => ({
  syncLocalEventsWithBackend: jest.fn(),
}));

// Mock Alert để bắt thông báo lỗi
jest.spyOn(Alert, 'alert');

describe('AddEventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mock trước mỗi test
  });

  it('renders form elements', () => {
    const { getByPlaceholderText, getByText } = render(<AddEventScreen />);
    
    expect(getByText('Add new event')).toBeTruthy();
    expect(getByPlaceholderText('Math, Physics...')).toBeTruthy();
    expect(getByText('SAVE EVENT')).toBeTruthy();
  });

  it('shows alert if title is missing', () => {
    const { getByText } = render(<AddEventScreen />);
    
    const saveButton = getByText('SAVE EVENT');
    fireEvent.press(saveButton);

    expect(Alert.alert).toHaveBeenCalledWith('Missing Info', 'Please enter event name');
    expect(createEvent).not.toHaveBeenCalled();
  });

});