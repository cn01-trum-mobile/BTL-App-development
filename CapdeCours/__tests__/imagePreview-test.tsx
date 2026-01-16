import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Image, TouchableOpacity } from 'react-native';

// 1. Import router to assert on it later
import { router } from 'expo-router';
import ImagePreviewScreen from '@/app/(main layout)/camera/imagePreview';

/* =====================================================
   MOCKS
===================================================== */

// 2. Define the mock function INSIDE the factory
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    uri: 'file://test-image.jpg',
    rotation: '1',
  }),
  router: {
    replace: jest.fn(),
  },
}));

// 3. Fix the Context mock hoisting issue as well
// We create an object to hold the mock functions so we can reference them
const mockActions = {
  setAction: jest.fn(),
  resetAction: jest.fn(),
};

jest.mock('@/context/NavActionContext', () => ({
  useBottomAction: () => ({
    setAction: mockActions.setAction,
    resetAction: mockActions.resetAction,
  }),
}));

const mockLoadEvents = jest.fn();

jest.mock('@/app/services/useUnifiedCalendar', () => ({
  useUnifiedCalendar: () => ({
    events: [
      {
        title: 'Math',
        startDate: new Date(Date.now() - 60_000).toISOString(),
        endDate: new Date(Date.now() + 60_000).toISOString(),
      },
    ],
    loading: false,
    loadEvents: mockLoadEvents,
  }),
}));

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    exists = true;
    constructor(uri: string) {
      this.uri = uri;
    }
    copy = jest.fn();
    write = jest.fn();
  }

  class MockDirectory {
    exists = true;
    create = jest.fn();
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: 'doc://' },
  };
});

jest.mock('@/utils/photoCache', () => ({
  addPhotoToCache: jest.fn(),
}));

jest.mock('@/components/Alert', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');

  return {
    Alert: ({ visible, message, onDismiss }: any) =>
      visible ? (
        <TouchableOpacity onPress={onDismiss}>
          <Text>{message}</Text>
        </TouchableOpacity>
      ) : null,
  };
});

/* =====================================================
   TESTS
===================================================== */

describe('ImagePreviewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the image preview', () => {
    const { UNSAFE_getAllByType } = render(<ImagePreviewScreen />);
    const images = UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThan(0);
  });

  it('loads calendar events on mount', () => {
    render(<ImagePreviewScreen />);
    expect(mockLoadEvents).toHaveBeenCalled();
  });

  it('sets download action when calendar finished loading', () => {
    render(<ImagePreviewScreen />);
    expect(mockActions.setAction).toHaveBeenCalled();
  });

  it('saves photo and shows success alert', async () => {
    const { getByText } = render(<ImagePreviewScreen />);

    await act(async () => {
      // Access the mock from our object
      const action = mockActions.setAction.mock.calls.find((c) => typeof c[0]?.onPress === 'function')[0];
      await action.onPress();
    });

    expect(getByText(/Saved:/)).toBeTruthy();
  });

  it('navigates back when alert is dismissed', async () => {
    jest.useFakeTimers();
    const { getByText } = render(<ImagePreviewScreen />);

    // 1. Trigger the save action
    await act(async () => {
      const action = mockActions.setAction.mock.calls.find((c) => typeof c[0]?.onPress === 'function')[0];
      await action.onPress();
    });

    // 2. Press the alert to dismiss it
    await act(async () => {
      fireEvent.press(getByText(/Saved:/));
    });

    // 3. Fast forward timers to trigger the auto-dismiss and navigation
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // 4. Assert using the imported 'router' object
    expect(router.replace).toHaveBeenCalledWith('/camera');
    
    jest.useRealTimers();
  });

  it('discard button navigates back', () => {
    const { UNSAFE_getAllByType } = render(<ImagePreviewScreen />);
    const buttons = UNSAFE_getAllByType(TouchableOpacity);

    // Assuming the discard button is the first TouchableOpacity rendered
    fireEvent.press(buttons[0]);

    // 4. Assert using the imported 'router' object
    expect(router.replace).toHaveBeenCalledWith('/camera');
  });
});
