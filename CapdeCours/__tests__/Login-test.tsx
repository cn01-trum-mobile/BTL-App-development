import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../app/(main layout)/login/index';
import { Alert } from 'react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

const mockLogin = jest.fn();
const mockGetToken = jest.fn();
const mockGetUsername = jest.fn();
const mockLogout = jest.fn();

const mockSyncLocalEventsWithBackend = jest.fn();
const mockSyncCloudEventsToLocal = jest.fn();
const mockGetCloudEventsCount = jest.fn();
const mockConvertCloudEventsToLocal = jest.fn();
const mockDeleteCloudEvents = jest.fn();

jest.mock('@/app/services/authApi', () => ({
  authApi: {
    login: (...args: any[]) => mockLogin(...args),
    getToken: () => mockGetToken(),
    getUsername: () => mockGetUsername(),
    logout: () => mockLogout(),
  },
}));

jest.mock('@/app/services/localCalendarService', () => ({
  syncLocalEventsWithBackend: () => mockSyncLocalEventsWithBackend(),
  syncCloudEventsToLocal: () => mockSyncCloudEventsToLocal(),
  getCloudEventsCount: () => mockGetCloudEventsCount(),
  convertCloudEventsToLocal: () => mockConvertCloudEventsToLocal(),
  deleteCloudEvents: () => mockDeleteCloudEvents(),
}));

const mockStoreData = jest.fn();
jest.mock('@/utils/asyncStorage', () => ({
  storeData: (...args: any[]) => mockStoreData(...args),
}));

describe('LoginScreen', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue(null);
    mockGetUsername.mockResolvedValue(null);
  });

  it('shows logged-in state when token exists', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetUsername.mockResolvedValue('existingUser');

    const { getByText } = render(<LoginScreen />);

    await waitFor(() => {
      expect(getByText('Signed in as')).toBeTruthy();
      expect(getByText('existingUser')).toBeTruthy();
    });
  });

  it('requires username and password', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('LOGIN'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Missing info',
        'Please enter username and password'
      );
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('logs in successfully and syncs calendar', async () => {
    mockLogin.mockResolvedValue({ access_token: 'abc' });

    const { getByText, getByPlaceholderText, queryByText } = render(
      <LoginScreen />
    );

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('Enter password'), '123456');

    fireEvent.press(getByText('LOGIN'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('testuser', '123456');
      expect(mockStoreData).toHaveBeenCalledWith('AUTH_SKIPPED', 'false');
      expect(mockSyncLocalEventsWithBackend).toHaveBeenCalled();
      expect(mockSyncCloudEventsToLocal).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(
        queryByText('Sign in to sync your study schedule to the cloud.')
      ).toBeNull();
      expect(getByText('Signed in as')).toBeTruthy();
    });
  });

  it('shows error when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'user');
    fireEvent.changeText(getByPlaceholderText('Enter password'), 'wrong');

    fireEvent.press(getByText('LOGIN'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Login failed',
        'Invalid credentials'
      );
    });
  });

  it('skips login and navigates to chooseCalendar', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Skip for now'));

    await waitFor(() => {
      expect(mockStoreData).toHaveBeenCalledWith('AUTH_SKIPPED', 'true');
    });
  });

  it('logs out when no cloud events', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetUsername.mockResolvedValue('user');
    mockGetCloudEventsCount.mockResolvedValue(0);

    const { getByText } = render(<LoginScreen />);

    await waitFor(() => getByText('Logout'));
    fireEvent.press(getByText('Logout'));

    await waitFor(() => {
      expect(mockSyncLocalEventsWithBackend).toHaveBeenCalled();
      expect(mockGetCloudEventsCount).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalled();
      expect(mockStoreData).toHaveBeenCalledWith('AUTH_SKIPPED', 'false');
    });
  });

  it('logout with cloud events and Keep as local', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetUsername.mockResolvedValue('user');
    mockGetCloudEventsCount.mockResolvedValue(2);

    let buttons: any[] = [];
    alertSpy.mockImplementation(
      (_title: string, _message?: string, bts?: any[]) => {
        if (bts) buttons = bts;
      }
    );

    const { getByText } = render(<LoginScreen />);

    await waitFor(() => getByText('Logout'));
    fireEvent.press(getByText('Logout'));

    await waitFor(() => {
      expect(buttons.length).toBeGreaterThan(0);
    });

    const keepBtn = buttons.find((b) => b.text === 'Keep as local');
    await keepBtn.onPress();

    expect(mockConvertCloudEventsToLocal).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it('logout with cloud events and Delete all', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetUsername.mockResolvedValue('user');
    mockGetCloudEventsCount.mockResolvedValue(3);

    let buttons: any[] = [];
    alertSpy.mockImplementation(
      (_title: string, _message?: string, bts?: any[]) => {
        if (bts) buttons = bts;
      }
    );

    const { getByText } = render(<LoginScreen />);

    await waitFor(() => getByText('Logout'));
    fireEvent.press(getByText('Logout'));

    await waitFor(() => {
      expect(buttons.length).toBeGreaterThan(0);
    });

    const deleteBtn = buttons.find((b) => b.text === 'Delete all');
    await deleteBtn.onPress();

    expect(mockDeleteCloudEvents).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it('logout with cloud events and Cancel', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetUsername.mockResolvedValue('user');
    mockGetCloudEventsCount.mockResolvedValue(1);

    let buttons: any[] = [];
    alertSpy.mockImplementation(
      (_title: string, _message?: string, bts?: any[]) => {
        if (bts) buttons = bts;
      }
    );

    const { getByText } = render(<LoginScreen />);

    await waitFor(() => getByText('Logout'));
    fireEvent.press(getByText('Logout'));

    await waitFor(() => {
      expect(buttons.length).toBeGreaterThan(0);
    });

    const cancelBtn = buttons.find((b) => b.text === 'Cancel');
    await cancelBtn.onPress();

    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('handles unexpected error during logout', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetUsername.mockResolvedValue('user');
    mockGetCloudEventsCount.mockRejectedValue(new Error('network error'));

    const { getByText } = render(<LoginScreen />);

    await waitFor(() => getByText('Logout'));
    fireEvent.press(getByText('Logout'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        'An error occurred during logout.'
      );
    });
  });
});


