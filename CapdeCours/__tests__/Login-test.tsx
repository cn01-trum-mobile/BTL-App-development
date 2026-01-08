import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../app/(main layout)/login/index'; // Đảm bảo đường dẫn đúng
import { Alert } from 'react-native';

// --- MOCKS SETUP ---

// 1. Mock Router để check điều hướng
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

// 2. Mock Auth API
const mockLogin = jest.fn();
const mockGetToken = jest.fn();
const mockGetUsername = jest.fn();
const mockLogout = jest.fn();

jest.mock('@/app/services/authApi', () => ({
  authApi: {
    login: (...args: any[]) => mockLogin(...args),
    getToken: () => mockGetToken(),
    getUsername: () => mockGetUsername(),
    logout: () => mockLogout(),
  },
}));

// 3. Mock Calendar Services
const mockSyncLocalEventsWithBackend = jest.fn();
const mockSyncCloudEventsToLocal = jest.fn();
const mockGetCloudEventsCount = jest.fn();
const mockConvertCloudEventsToLocal = jest.fn();
const mockDeleteCloudEvents = jest.fn();

jest.mock('@/app/services/localCalendarService', () => ({
  syncLocalEventsWithBackend: () => mockSyncLocalEventsWithBackend(),
  syncCloudEventsToLocal: () => mockSyncCloudEventsToLocal(),
  getCloudEventsCount: () => mockGetCloudEventsCount(),
  convertCloudEventsToLocal: () => mockConvertCloudEventsToLocal(),
  deleteCloudEvents: () => mockDeleteCloudEvents(),
}));

// 4. Mock AsyncStorage
const mockStoreData = jest.fn();
jest.mock('@/utils/asyncStorage', () => ({
  storeData: (...args: any[]) => mockStoreData(...args),
}));

// --- TEST SUITE ---

describe('LoginScreen', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    jest.clearAllMocks();
    // Default state: User chưa login
    mockGetToken.mockResolvedValue(null);
    mockGetUsername.mockResolvedValue(null);
  });

  // --- UI RENDERING & NAVIGATION CHECKS ---

  it('renders correctly in logged-out state', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);
    
    // Check các element cơ bản
    expect(getByText('Welcome back')).toBeTruthy();
    expect(getByPlaceholderText('Enter username')).toBeTruthy();
    expect(getByText('LOGIN')).toBeTruthy();
    expect(getByText('Skip for now')).toBeTruthy();
    
    // Check nút Sign Up mới thêm (nếu bạn đã thêm vào UI)
    // Dùng queryByText để không crash nếu bạn chưa kịp thêm UI
    const signUpText = getByText('Sign Up'); 
    expect(signUpText).toBeTruthy();
  });

  it('skips login and navigates to chooseCalendar', async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Skip for now'));

    await waitFor(() => {
      expect(mockStoreData).toHaveBeenCalledWith('AUTH_SKIPPED', 'true');
      expect(mockReplace).toHaveBeenCalledWith('/(main layout)/login/chooseCalendar');
    });
  });

  // --- LOGIN LOGIC ---

  it('shows logged-in state when token exists', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetUsername.mockResolvedValue('existingUser');

    const { getByText } = render(<LoginScreen />);

    await waitFor(() => {
      expect(getByText('Signed in as')).toBeTruthy();
      expect(getByText('existingUser')).toBeTruthy();
      // Check nút logout có hiện không
      expect(getByText('Logout')).toBeTruthy();
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
      // Kiểm tra sync flow
      expect(mockSyncLocalEventsWithBackend).toHaveBeenCalled();
      expect(mockSyncCloudEventsToLocal).toHaveBeenCalled();
    });

    // Kiểm tra UI chuyển sang trạng thái đã login
    await waitFor(() => {
      expect(queryByText('Enter username')).toBeNull(); // Input biến mất
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

  // --- LOGGED IN ACTIONS ---

  it('navigates to system calendar selection when logged in', async () => {
    mockGetToken.mockResolvedValue('token-123');
    const { getByText } = render(<LoginScreen />);

    await waitFor(() => getByText('Add from system calendar'));
    fireEvent.press(getByText('Add from system calendar'));

    expect(mockPush).toHaveBeenCalledWith('/(main layout)/login/chooseCalendar');
  });

  it('navigates to change password screen', async () => {
    mockGetToken.mockResolvedValue('token-123');
    const { getByText } = render(<LoginScreen />);

    await waitFor(() => getByText('Change password'));
    fireEvent.press(getByText('Change password'));

    expect(mockPush).toHaveBeenCalledWith('/(main layout)/login/changeInfo');
  });

  // --- LOGOUT LOGIC (COMPLEX) ---

  it('logs out immediately when no cloud events', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetUsername.mockResolvedValue('user');
    mockGetCloudEventsCount.mockResolvedValue(0); // 0 Events

    const { getByText } = render(<LoginScreen />);

    await waitFor(() => getByText('Logout'));
    fireEvent.press(getByText('Logout'));

    await waitFor(() => {
      expect(mockSyncLocalEventsWithBackend).toHaveBeenCalled(); // Sync lần cuối
      expect(mockGetCloudEventsCount).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalled(); // Logout luôn
      expect(mockStoreData).toHaveBeenCalledWith('AUTH_SKIPPED', 'false');
    });
  });

  it('logout with cloud events and user chooses "Keep as local"', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetCloudEventsCount.mockResolvedValue(5); // Có 5 events

    // Mock hành vi bấm nút Alert
    let buttons: any[] = [];
    alertSpy.mockImplementation(
      (_title: string, _message?: string, bts?: any[]) => {
        if (bts) buttons = bts;
      }
    );

    const { getByText } = render(<LoginScreen />);
    await waitFor(() => getByText('Logout'));
    fireEvent.press(getByText('Logout'));

    // Chờ Alert hiện
    await waitFor(() => {
      expect(buttons.length).toBeGreaterThan(0);
    });

    // Bấm nút "Keep as local"
    const keepBtn = buttons.find((b) => b.text === 'Keep as local');
    await keepBtn.onPress();

    expect(mockConvertCloudEventsToLocal).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it('logout with cloud events and user chooses "Delete all"', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetCloudEventsCount.mockResolvedValue(3);

    let buttons: any[] = [];
    alertSpy.mockImplementation((_t, _m, bts) => { if (bts) buttons = bts; });

    const { getByText } = render(<LoginScreen />);
    await waitFor(() => getByText('Logout'));
    fireEvent.press(getByText('Logout'));

    await waitFor(() => expect(buttons.length).toBeGreaterThan(0));

    // Bấm nút "Delete all"
    const deleteBtn = buttons.find((b) => b.text === 'Delete all');
    await deleteBtn.onPress();

    expect(mockDeleteCloudEvents).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });

  it('logout with cloud events and user chooses "Cancel"', async () => {
    mockGetToken.mockResolvedValue('token-123');
    mockGetCloudEventsCount.mockResolvedValue(1);

    let buttons: any[] = [];
    alertSpy.mockImplementation((_t, _m, bts) => { if (bts) buttons = bts; });

    const { getByText } = render(<LoginScreen />);
    await waitFor(() => getByText('Logout'));
    fireEvent.press(getByText('Logout'));

    await waitFor(() => expect(buttons.length).toBeGreaterThan(0));

    // Bấm nút Cancel
    const cancelBtn = buttons.find((b) => b.text === 'Cancel');
    await cancelBtn.onPress();

    // Không được gọi logout
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('handles unexpected error during logout', async () => {
    mockGetToken.mockResolvedValue('token-123');
    // Giả lập lỗi mạng khi check cloud events
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