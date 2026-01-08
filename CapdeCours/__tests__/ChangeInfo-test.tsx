import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChangeInfoScreen from '../app/(main layout)/login/changeInfo';
import { Alert } from 'react-native';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: () => mockBack(),
  }),
}));

const mockGetUsername = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('@/app/services/authApi', () => ({
  authApi: {
    getUsername: () => mockGetUsername(),
    updateUser: (...args: any[]) => mockUpdateUser(...args),
  },
}));

describe('ChangeInfoScreen', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUsername.mockResolvedValue('currentUser');
  });

  it('loads current username on mount', async () => {
    render(<ChangeInfoScreen />);

    await waitFor(() => {
      expect(mockGetUsername).toHaveBeenCalled();
    });
  });

  it('shows error if username not found', async () => {
    mockGetUsername.mockResolvedValue(null);

    const { getByText } = render(<ChangeInfoScreen />);

    await waitFor(() => expect(mockGetUsername).toHaveBeenCalled());

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Username not found');
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('validates short password', async () => {
    const { getByText, getByPlaceholderText } = render(<ChangeInfoScreen />);

    await waitFor(() => expect(mockGetUsername).toHaveBeenCalled());

    fireEvent.changeText(
      getByPlaceholderText('Enter new password (optional)'),
      '123'
    );

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Invalid Password',
        'Password must be at least 6 characters long'
      );
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('validates password mismatch', async () => {
    const { getByText, getByPlaceholderText } = render(<ChangeInfoScreen />);

    await waitFor(() => expect(mockGetUsername).toHaveBeenCalled());

    fireEvent.changeText(
      getByPlaceholderText('Enter new password (optional)'),
      '123456'
    );

    const confirmInput = getByPlaceholderText('Confirm new password');
    fireEvent.changeText(confirmInput, '654321');

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Password Mismatch',
        'Passwords do not match'
      );
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('requires at least name or password', async () => {
    const { getByText } = render(<ChangeInfoScreen />);

    await waitFor(() => expect(mockGetUsername).toHaveBeenCalled());

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Missing Information',
        'Please enter at least name or password to update'
      );
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('updates only name', async () => {
    const { getByText, getByPlaceholderText } = render(<ChangeInfoScreen />);

    await waitFor(() => expect(mockGetUsername).toHaveBeenCalled());

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'New Name');

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(
        'currentUser',
        'New Name',
        undefined
      );
    });

    const [[title, message, buttons]] = alertSpy.mock.calls as any;
    expect(title).toBe('Success');
    expect(message).toBe('Your information has been updated successfully');
    const buttonList = (buttons as any[]) || [];
    const okButton = buttonList.find((b: any) => b.text === 'OK');
    if (okButton && typeof okButton.onPress === 'function') {
      await okButton.onPress();
    }
    expect(mockBack).toHaveBeenCalled();
  });

  it('updates only password', async () => {
    const { getByText, getByPlaceholderText } = render(<ChangeInfoScreen />);

    await waitFor(() => expect(mockGetUsername).toHaveBeenCalled());

    fireEvent.changeText(
      getByPlaceholderText('Enter new password (optional)'),
      '123456'
    );
    fireEvent.changeText(
      getByPlaceholderText('Confirm new password'),
      '123456'
    );

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(
        'currentUser',
        undefined,
        '123456'
      );
    });
  });

  it('updates both name and password', async () => {
    const { getByText, getByPlaceholderText } = render(<ChangeInfoScreen />);

    await waitFor(() => expect(mockGetUsername).toHaveBeenCalled());

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'New Name');
    fireEvent.changeText(
      getByPlaceholderText('Enter new password (optional)'),
      'abcdef'
    );
    fireEvent.changeText(
      getByPlaceholderText('Confirm new password'),
      'abcdef'
    );

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(
        'currentUser',
        'New Name',
        'abcdef'
      );
    });
  });

  it('shows error when updateUser fails', async () => {
    mockUpdateUser.mockRejectedValue(new Error('API error'));

    const { getByText, getByPlaceholderText } = render(<ChangeInfoScreen />);

    await waitFor(() => expect(mockGetUsername).toHaveBeenCalled());

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'New Name');

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Update Failed',
        'API error'
      );
    });
  });
});


