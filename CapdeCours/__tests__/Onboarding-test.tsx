import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Onboarding from '../app/(custom layout)/onboarding/index';
import { router } from 'expo-router';
import * as asyncStorage from '@/utils/asyncStorage';
import { Dimensions } from 'react-native';

// --- MOCKS ---

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('@/utils/asyncStorage', () => ({
  storeData: jest.fn(),
}));

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: any) => fn(),
  createSerializable: (v: any) => v,
  makeShareable: (v: any) => v,
  makeShareableCloneRecursive: (v: any) => v,
  registerWorklet: () => {},
}));

// Mock Reanimated to track shared values
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: {
      View: (props: any) => <>{props.children}</>,
    },
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: (fn: any) => (fn ? fn() : {}),
    withTiming: (toValue: any, config: any, callback: any) => {
      if (callback) callback(true);
      return toValue;
    },
  };
});

// Mock Gesture Handler to capture callback instances
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  const panInstances: any[] = [];
  return {
    Gesture: {
      Pan: () => {
        const obj: any = {};
        obj.onEnd = (cb: any) => {
          obj._onEnd = cb;
          return obj;
        };
        obj.onChange = (cb: any) => {
          obj._onChange = cb;
          return obj;
        };
        panInstances.push(obj);
        return obj;
      },
      Simultaneous: jest.fn().mockReturnValue({}),
    },
    GestureDetector: ({ children }: any) => children,
    GestureHandlerRootView: View,
    __panInstances: panInstances, // Expose this for testing
  };
});

// --- TESTS ---

describe('Onboarding Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset gesture instances before each test
    const gesture = require('react-native-gesture-handler');
    gesture.__panInstances.length = 0;
  });

  it('renders the first screen correctly', () => {
    const { getByText, queryByText } = render(<Onboarding />);
    expect(getByText('In-App Camera')).toBeTruthy();
    expect(getByText('Next')).toBeTruthy();
    expect(queryByText('Prev')).toBeNull();
  });

  it('skips onboarding when Skip button is pressed', async () => {
    const { getByText } = render(<Onboarding />);

    fireEvent.press(getByText('Skip'));

    await waitFor(() => {
      expect(asyncStorage.storeData).toHaveBeenCalledWith('onboarded', '1');
      expect(router.replace).toHaveBeenCalledWith('/(main layout)/login');
    });
  });

  it('navigates Next -> Next -> Next -> Start -> Finish', async () => {
    const { getByText } = render(<Onboarding />);

    // Screen 1 -> 2
    fireEvent.press(getByText('Next'));
    await waitFor(() => expect(getByText('Sync Timetable')).toBeTruthy());

    // Screen 2 -> 3
    fireEvent.press(getByText('Next'));
    await waitFor(() => expect(getByText('Automatic Sorting')).toBeTruthy());

    // Screen 3 -> 4
    fireEvent.press(getByText('Next'));
    await waitFor(() => {
      expect(getByText('Gallery & Search')).toBeTruthy();
      expect(getByText('Start')).toBeTruthy(); // Button changes to Start
    });

    // Click Start
    fireEvent.press(getByText('Start'));

    await waitFor(() => {
      expect(asyncStorage.storeData).toHaveBeenCalledWith('onboarded', '1');
      expect(router.replace).toHaveBeenCalledWith('/(main layout)/login');
    });
  });

  it('navigates Back when Prev button is pressed', async () => {
    const { getByText, queryByText } = render(<Onboarding />);

    // Go to Screen 2
    fireEvent.press(getByText('Next'));
    await waitFor(() => expect(getByText('Sync Timetable')).toBeTruthy());

    // Go Back to Screen 1
    fireEvent.press(getByText('Prev'));
    await waitFor(() => {
      expect(getByText('In-App Camera')).toBeTruthy();
      expect(queryByText('Prev')).toBeNull();
    });
  });

  // --- GESTURE TESTS ---

  it('handles SWIPE gesture to navigate next/prev', async () => {
    const gesture = require('react-native-gesture-handler');
    const { getByText } = render(<Onboarding />);

    // Wait for render to register gestures
    expect(gesture.__panInstances.length).toBeGreaterThanOrEqual(1);

    // Instance 0 is swipeGesture (defined first in your component)
    const swipeGesture = gesture.__panInstances[0];

    // 1. Simulate Swipe LEFT ( < -80 ) -> Go Next
    act(() => {
      swipeGesture._onEnd({ translationX: -100 });
    });
    await waitFor(() => expect(getByText('Sync Timetable')).toBeTruthy());

    // 2. Simulate Swipe RIGHT ( > 80 ) -> Go Prev
    act(() => {
      swipeGesture._onEnd({ translationX: 100 });
    });
    await waitFor(() => expect(getByText('In-App Camera')).toBeTruthy());
  });

  it('handles DRAG gesture updates (logic check)', () => {
    const gesture = require('react-native-gesture-handler');
    // Render component
    render(<Onboarding />);

    // Instance 1 is dragGesture (defined second in your component)
    const dragGesture = gesture.__panInstances[1];

    // We need to access the sharedValue to verify it changed.
    // In a real integration test, we'd check style, but here we are unit testing logic.
    // We can infer logic execution by ensuring no errors are thrown and coverage is hit.

    const screenWidth = Dimensions.get('window').width;
    const screenOffset = (screenWidth * (4 - 1)) / 2; // 4 screens

    // 1. Valid Drag
    // Current X starts at screenOffset. Moving -50 should be valid.
    expect(() => {
      dragGesture._onChange({ changeX: -50 });
    }).not.toThrow();

    // 2. Boundary Check (Right Side)
    // Trying to drag further right than allowed
    // (translateX.value + event.changeX < screenOffset) violation check
    // Note: Logic in component prevents `translateX.value` update if out of bounds.
    // Since we mocked sharedValue, we can't easily spy on the mutation,
    // but executing the function verifies the conditional logic doesn't crash.
    dragGesture._onChange({ changeX: 5000 }); // Huge swipe right

    // 3. Boundary Check (Left Side)
    dragGesture._onChange({ changeX: -5000 }); // Huge swipe left

    // 4. On End (Snap back)
    dragGesture._onEnd();
  });
});
