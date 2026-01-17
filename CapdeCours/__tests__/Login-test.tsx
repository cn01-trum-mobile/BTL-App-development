import React from 'react';
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react-native';
import LoginScreen from '../app/(main layout)/login/index'; // Adjust path if needed
import { Alert } from 'react-native';
import { authApi } from '@/app/services/authApi';
import { storeData } from '@/utils/asyncStorage';
import * as LocalCalendarService from '@/app/services/localCalendarService';
import { useRouter } from 'expo-router';

// --- 1. MOCKS ---

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

// Mock Lucide Icons (to prevent rendering issues)
jest.mock('lucide-react-native', () => ({
  User: () => 'UserIcon',
  LogOut: () => 'LogOutIcon',
  Key: () => 'KeyIcon',
  Calendar: () => 'CalendarIcon',
}));

// Mock Services
jest.mock('@/app/services/authApi', () => ({
  authApi: {
    getToken: jest.fn(),
    getUsername: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('@/utils/asyncStorage', () => ({
  storeData: jest.fn(),
}));

jest.mock('@/app/services/localCalendarService', () => ({
  syncLocalEventsWithBackend: jest.fn(),
  syncCloudEventsToLocal: jest.fn(),
  getCloudEventsCount: jest.fn(),
  convertCloudEventsToLocal: jest.fn(),
  deleteCloudEvents: jest.fn(),
}));

describe('LoginScreen', () => {
  const mockRouter = { push: jest.fn(), replace: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    // Default: User is NOT logged in
    (authApi.getToken as jest.Mock).mockResolvedValue(null);
  });

  // --- INITIAL RENDER TESTS ---

  it('renders login form when no token exists', async () => {
    render(<LoginScreen />);

    // Wait for useEffect to finish
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter username')).toBeTruthy();
      expect(screen.getByText('LOGIN')).toBeTruthy();
      expect(screen.queryByText('Signed in as')).toBeNull();
    });
  });

  it('renders profile view when token exists', async () => {
    (authApi.getToken as jest.Mock).mockResolvedValue('fake-token');
    (authApi.getUsername as jest.Mock).mockResolvedValue('TestUser');

    render(<LoginScreen />);

    await waitFor(() => {
      expect(screen.getByText('Signed in as')).toBeTruthy();
      expect(screen.getByText('TestUser')).toBeTruthy();
      expect(screen.queryByPlaceholderText('Enter username')).toBeNull();
    });
  });

  // --- LOGIN FLOW TESTS ---

  it('validates empty input', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<LoginScreen />);

    fireEvent.press(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Missing info', 'Please enter username and password');
      expect(authApi.login).not.toHaveBeenCalled();
    });
  });

  it('handles login success and syncs data', async () => {
    render(<LoginScreen />);

    // Input data
    fireEvent.changeText(screen.getByPlaceholderText('Enter username'), 'myuser');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'mypass');

    // Setup success mocks
    (authApi.login as jest.Mock).mockResolvedValue(true);

    fireEvent.press(screen.getByText('LOGIN'));

    await waitFor(() => {
      // 1. API Call
      expect(authApi.login).toHaveBeenCalledWith('myuser', 'mypass');
      // 2. Storage Update
      expect(storeData).toHaveBeenCalledWith('AUTH_SKIPPED', 'false');
      // 3. Sync Functions
      expect(LocalCalendarService.syncLocalEventsWithBackend).toHaveBeenCalled();
      expect(LocalCalendarService.syncCloudEventsToLocal).toHaveBeenCalled();
      // 4. UI Update
      expect(screen.getByText('Signed in as')).toBeTruthy();
      expect(screen.getByText('myuser')).toBeTruthy();
    });
  });

  it('handles login failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter username'), 'user');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'pass');

    (authApi.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    fireEvent.press(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Login failed', 'Invalid credentials');
      expect(screen.queryByText('Signed in as')).toBeNull();
    });
  });

  // --- NAVIGATION & SKIP TESTS ---

  it('handles skip button', async () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText('Skip for now'));

    await waitFor(() => {
      expect(storeData).toHaveBeenCalledWith('AUTH_SKIPPED', 'true');
      expect(mockRouter.replace).toHaveBeenCalledWith('/(main layout)/login/chooseCalendar');
    });
  });

  it('navigates to register screen', async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('Sign Up'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(main layout)/login/registerScreen');
  });

  // --- LOGOUT FLOW TESTS (COMPLEX) ---

  it('logs out immediately if no cloud events exist', async () => {
    // Setup logged in state
    (authApi.getToken as jest.Mock).mockResolvedValue('token');
    (LocalCalendarService.getCloudEventsCount as jest.Mock).mockResolvedValue(0); // No events

    render(<LoginScreen />);
    await waitFor(() => screen.getByText('Logout'));

    fireEvent.press(screen.getByText('Logout'));

    await waitFor(() => {
      expect(LocalCalendarService.syncLocalEventsWithBackend).toHaveBeenCalled(); // Tried to sync first
      expect(authApi.logout).toHaveBeenCalled();
      expect(storeData).toHaveBeenCalledWith('AUTH_SKIPPED', 'false');
      expect(screen.getByPlaceholderText('Enter username')).toBeTruthy(); // Back to login form
    });
  });

  it('asks user when cloud events exist, then "Keep as local"', async () => {
    // Setup logged in state
    (authApi.getToken as jest.Mock).mockResolvedValue('token');
    (LocalCalendarService.getCloudEventsCount as jest.Mock).mockResolvedValue(5); // 5 events

    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<LoginScreen />);
    await waitFor(() => screen.getByText('Logout'));

    fireEvent.press(screen.getByText('Logout'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      // Check alert title
      expect(alertSpy.mock.calls[0][0]).toBe('Cloud Events');
    });

    // Simulate pressing "Keep as local"
    const buttons = alertSpy.mock.calls[0][2];
    const keepButton = buttons?.find((btn) => btn.text === 'Keep as local');

    await act(async () => {
      if (keepButton && keepButton.onPress) {
        await keepButton.onPress();
      }
    });

    expect(LocalCalendarService.convertCloudEventsToLocal).toHaveBeenCalled();
    expect(authApi.logout).toHaveBeenCalled();
  });

  it('asks user when cloud events exist, then "Delete all"', async () => {
    // Setup logged in state
    (authApi.getToken as jest.Mock).mockResolvedValue('token');
    (LocalCalendarService.getCloudEventsCount as jest.Mock).mockResolvedValue(5);

    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<LoginScreen />);
    await waitFor(() => screen.getByText('Logout'));

    fireEvent.press(screen.getByText('Logout'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    // Simulate pressing "Delete all"
    const buttons = alertSpy.mock.calls[0][2];
    const deleteButton = buttons?.find((btn) => btn.text === 'Delete all');

    await act(async () => {
      if (deleteButton && deleteButton.onPress) {
        await deleteButton.onPress();
      }
    });

    expect(LocalCalendarService.deleteCloudEvents).toHaveBeenCalled();
    expect(authApi.logout).toHaveBeenCalled();
  });

  // --- ADDITIONAL EDGE CASE TESTS FOR INCREASED COVERAGE ---

  it('handles username with whitespace only', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter username'), '   ');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'password');

    fireEvent.press(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Missing info', 'Please enter username and password');
      expect(authApi.login).not.toHaveBeenCalled();
    });
  });

  it('handles password with whitespace only', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter username'), 'username');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), '   ');

    fireEvent.press(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Missing info', 'Please enter username and password');
      expect(authApi.login).not.toHaveBeenCalled();
    });
  });

  it('handles token exists but username returns null', async () => {
    (authApi.getToken as jest.Mock).mockResolvedValue('fake-token');
    (authApi.getUsername as jest.Mock).mockResolvedValue(null);

    render(<LoginScreen />);

    await waitFor(() => {
      expect(screen.getByText('Signed in as')).toBeTruthy();
      expect(screen.getByText('User')).toBeTruthy(); // Should show 'User' as fallback
    });
  });

  it('handles logout error during sync before logout', async () => {
    (authApi.getToken as jest.Mock).mockResolvedValue('token');
    (LocalCalendarService.getCloudEventsCount as jest.Mock).mockResolvedValue(0);
    (LocalCalendarService.syncLocalEventsWithBackend as jest.Mock).mockRejectedValue(new Error('Sync failed'));

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(<LoginScreen />);
    await waitFor(() => screen.getByText('Logout'));

    fireEvent.press(screen.getByText('Logout'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Sync before logout failed:', expect.any(Error));
      expect(authApi.logout).toHaveBeenCalled(); // Should still logout despite sync error
    });

    consoleSpy.mockRestore();
  });

  it('handles logout error in performLogout', async () => {
    (authApi.getToken as jest.Mock).mockResolvedValue('token');
    (LocalCalendarService.getCloudEventsCount as jest.Mock).mockResolvedValue(0);
    (authApi.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<LoginScreen />);
    await waitFor(() => screen.getByText('Logout'));

    fireEvent.press(screen.getByText('Logout'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      expect(alertSpy).toHaveBeenCalledWith('Error', 'An error occurred during logout.');
    });

    consoleSpy.mockRestore();
  });

  it('handles cloud events operation error in logout', async () => {
    (authApi.getToken as jest.Mock).mockResolvedValue('token');
    (LocalCalendarService.getCloudEventsCount as jest.Mock).mockRejectedValue(new Error('Cloud count failed'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<LoginScreen />);
    await waitFor(() => screen.getByText('Logout'));

    fireEvent.press(screen.getByText('Logout'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      expect(alertSpy).toHaveBeenCalledWith('Error', 'An error occurred during logout.');
    });

    consoleSpy.mockRestore();
  });

  it('shows loading state during login', async () => {
    render(<LoginScreen />);
    
    // Setup login to take time
    (authApi.login as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));

    fireEvent.changeText(screen.getByPlaceholderText('Enter username'), 'user');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'pass');
    
    fireEvent.press(screen.getByText('LOGIN'));

    // Should show loading indicator
    expect(screen.getByTestId('activity-indicator')).toBeTruthy();

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Signed in as')).toBeTruthy();
    }, { timeout: 200 });
  });

  it('shows loading state during logout', async () => {
    (authApi.getToken as jest.Mock).mockResolvedValue('token');
    (LocalCalendarService.getCloudEventsCount as jest.Mock).mockResolvedValue(0);
    
    // Setup logout to take time
    (authApi.logout as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(), 100)));

    render(<LoginScreen />);
    await waitFor(() => screen.getByText('Logout'));

    fireEvent.press(screen.getByText('Logout'));

    // Should show loading indicator on logout button
    await waitFor(() => {
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });
  });

  it('cancels logout when user presses Cancel in cloud events dialog', async () => {
    (authApi.getToken as jest.Mock).mockResolvedValue('token');
    (LocalCalendarService.getCloudEventsCount as jest.Mock).mockResolvedValue(5);

    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<LoginScreen />);
    await waitFor(() => screen.getByText('Logout'));

    fireEvent.press(screen.getByText('Logout'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    // Simulate pressing "Cancel"
    const buttons = alertSpy.mock.calls[0][2];
    const cancelButton = buttons?.find((btn) => btn.text === 'Cancel');

    await act(async () => {
      if (cancelButton && cancelButton.onPress) {
        await cancelButton.onPress();
      }
    });

    // Should not call any logout functions
    expect(authApi.logout).not.toHaveBeenCalled();
    expect(LocalCalendarService.convertCloudEventsToLocal).not.toHaveBeenCalled();
    expect(LocalCalendarService.deleteCloudEvents).not.toHaveBeenCalled();
  });

  it('navigates to add system calendar when logged in', async () => {
    (authApi.getToken as jest.Mock).mockResolvedValue('token');
    (authApi.getUsername as jest.Mock).mockResolvedValue('TestUser');

    render(<LoginScreen />);

    await waitFor(() => {
      expect(screen.getByText('Add system calendar')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Add system calendar'));

    expect(mockRouter.push).toHaveBeenCalledWith('/(main layout)/login/chooseCalendar');
  });

  it('navigates to change password when logged in', async () => {
    (authApi.getToken as jest.Mock).mockResolvedValue('token');
    (authApi.getUsername as jest.Mock).mockResolvedValue('TestUser');

    render(<LoginScreen />);

    await waitFor(() => {
      expect(screen.getByText('Change password')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Change password'));

    expect(mockRouter.push).toHaveBeenCalledWith('/(main layout)/login/changeInfo');
  });

  it('handles login with undefined error message', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter username'), 'user');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'pass');

    (authApi.login as jest.Mock).mockRejectedValue(new Error());

    fireEvent.press(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Login failed', 'Cannot login, please try again');
    });
  });

  it('handles login with null error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText('Enter username'), 'user');
    fireEvent.changeText(screen.getByPlaceholderText('Enter password'), 'pass');

    (authApi.login as jest.Mock).mockRejectedValue(null);

    fireEvent.press(screen.getByText('LOGIN'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Login failed', 'Cannot login, please try again');
    });
  });
});
