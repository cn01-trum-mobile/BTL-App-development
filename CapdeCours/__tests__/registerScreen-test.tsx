import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import RegisterScreen from '../app/(main layout)/login/registerScreen'; // Adjust path if needed
import { Alert } from 'react-native';
import { authApi } from '@/app/services/authApi';
import { useRouter } from 'expo-router';

// --- MOCKS ---

// Mock Expo Router
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

// Mock Auth API
jest.mock('@/app/services/authApi', () => ({
  authApi: {
    register: jest.fn(),
  },
}));

// Mock Icons to prevent rendering issues
jest.mock('lucide-react-native', () => ({
  ArrowLeft: () => 'ArrowLeft',
}));

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  // --- RENDERING ---

  it('renders all input fields and buttons correctly', () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    expect(getByPlaceholderText('Ex: John Doe')).toBeTruthy();
    expect(getByPlaceholderText('Ex: johndoe123')).toBeTruthy();
    expect(getByPlaceholderText('Enter password')).toBeTruthy();
    expect(getByPlaceholderText('Re-enter password')).toBeTruthy();
    expect(getByText('SIGN UP')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy(); // Footer link
  });

  // --- VALIDATION TESTS ---

  it('alerts when fields are empty', () => {
    const { getByText } = render(<RegisterScreen />);

    fireEvent.press(getByText('SIGN UP'));

    expect(Alert.alert).toHaveBeenCalledWith('Missing info', 'Please fill in all fields');
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('alerts when passwords do not match', () => {
    const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

    // Fill valid info except matching passwords
    fireEvent.changeText(getByPlaceholderText('Ex: John Doe'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('Ex: johndoe123'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('Enter password'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Re-enter password'), 'password999'); // Mismatch

    fireEvent.press(getByText('SIGN UP'));

    expect(Alert.alert).toHaveBeenCalledWith('Password mismatch', 'Passwords do not match');
    expect(authApi.register).not.toHaveBeenCalled();
  });

  // --- API SUCCESS FLOW ---

  it('calls register API and navigates back on success', async () => {
    (authApi.register as jest.Mock).mockResolvedValue(true);
    const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

    // Fill all inputs
    fireEvent.changeText(getByPlaceholderText('Ex: John Doe'), '  Test Name  '); // Test trimming
    fireEvent.changeText(getByPlaceholderText('Ex: johndoe123'), '  testuser  ');
    fireEvent.changeText(getByPlaceholderText('Enter password'), '123456');
    fireEvent.changeText(getByPlaceholderText('Re-enter password'), '123456');

    fireEvent.press(getByText('SIGN UP'));

    // 1. Verify API Call
    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith('Test Name', 'testuser', '123456');
    });

    // 2. Verify Success Alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Account created successfully! Please login.', expect.any(Array));
    });

    // 3. Simulate pressing "OK" on the Alert
    // We grab the arguments passed to Alert.alert and manually invoke the onPress of the first button
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const successCall = alertCalls.find((call) => call[0] === 'Success');
    const buttons = successCall[2]; // The 3rd argument is the buttons array

    // Execute the onPress function of the 'OK' button
    act(() => {
      buttons[0].onPress();
    });

    expect(mockBack).toHaveBeenCalled();
  });

  // --- API FAILURE FLOW ---

  it('shows error alert when registration fails', async () => {
    const errorMessage = 'Username already taken';
    (authApi.register as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

    fireEvent.changeText(getByPlaceholderText('Ex: John Doe'), 'Test');
    fireEvent.changeText(getByPlaceholderText('Ex: johndoe123'), 'test');
    fireEvent.changeText(getByPlaceholderText('Enter password'), '123');
    fireEvent.changeText(getByPlaceholderText('Re-enter password'), '123');

    fireEvent.press(getByText('SIGN UP'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Registration failed', errorMessage + '\nPassword needs at least 8 characters, including 1 uppercase character, 1 number and 1 special character' || 'Cannot create account, please try again');
    });
  });

  // --- NAVIGATION ---

  it('navigates back when Login link is pressed', () => {
    const { getByText } = render(<RegisterScreen />);

    fireEvent.press(getByText('Login'));

    expect(mockBack).toHaveBeenCalled();
  });
});
