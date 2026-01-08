import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import CameraScreen from '../app/(main layout)/camera/index';
import { TouchableOpacity, View } from 'react-native';

// --- SHARED STATE ---
const mockGestureCallbacks: any = {
  tapEnd: undefined,
  pinchStart: undefined,
  pinchUpdate: undefined,
  pinchEnd: undefined,
};

const mockNavContext = {
  onPress: undefined as any,
};

// --- MOCKS ---

// 1. Gesture Handler (Cấu trúc rõ ràng hơn)
jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');
  const MockGestureDetector = ({ children }: any) => <View>{children}</View>;
  MockGestureDetector.displayName = 'GestureDetector';

  return {
    Gesture: {
      Tap: () => ({
        numberOfTaps: () => ({
          onEnd: (cb: any) => {
            mockGestureCallbacks.tapEnd = cb;
            return {};
          },
        }),
      }),
      Pinch: () => ({
        onStart: (cbStart: any) => {
          mockGestureCallbacks.pinchStart = cbStart;
          return {
            onUpdate: (cbUpdate: any) => {
              mockGestureCallbacks.pinchUpdate = cbUpdate;
              return {
                onEnd: (cbEnd: any) => {
                  mockGestureCallbacks.pinchEnd = cbEnd;
                  return {};
                },
              };
            },
          };
        },
      }),
      Simultaneous: () => {},
    },
    GestureDetector: MockGestureDetector,
  };
});

// 2. Expo Camera
const mockTakePictureAsync = jest.fn().mockResolvedValue({
  uri: 'photo.jpg',
  exif: { Orientation: 1 },
});

jest.mock('expo-camera', () => {
  const { View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');

  const MockCameraView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: mockTakePictureAsync,
    }));
    return <View testID="camera-view" {...props} />;
  });
  MockCameraView.displayName = 'CameraView';

  return {
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
    CameraView: MockCameraView,
    CameraType: {},
  };
});

// 3. Context
jest.mock('@/context/NavActionContext', () => ({
  useBottomAction: () => ({
    setAction: jest.fn((config) => {
      mockNavContext.onPress = config.onPress;
    }),
    setDisabled: jest.fn(),
    resetAction: jest.fn(),
  }),
}));

// 4. Router & Utils
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: Function, args: any) => fn(args),
}));
jest.mock('lucide-react-native', () => ({
  ScanLine: () => null,
  SwitchCamera: () => null,
}));

describe('Camera Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGestureCallbacks.tapEnd = undefined;
    mockGestureCallbacks.pinchStart = undefined;
    mockGestureCallbacks.pinchUpdate = undefined;
    mockGestureCallbacks.pinchEnd = undefined;
    mockNavContext.onPress = undefined;
  });

  it('renders correctly', () => {
    const { getByTestId } = render(<CameraScreen />);
    expect(getByTestId('camera-view')).toBeTruthy();
  });

  it('takes picture', async () => {
    render(<CameraScreen />);

    // Trigger Context Action
    await act(async () => {
      if (mockNavContext.onPress) await mockNavContext.onPress();
    });

    expect(mockTakePictureAsync).toHaveBeenCalled();
  });

  it('switches camera', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(<CameraScreen />);
    const btn = UNSAFE_getAllByType(TouchableOpacity)[0];

    fireEvent.press(btn);
    expect(getByTestId('camera-view').props.facing).toBe('front');
  });

  it('handles Zoom boundaries', () => {
    const { getByTestId } = render(<CameraScreen />);

    act(() => {
      if (mockGestureCallbacks.pinchStart) mockGestureCallbacks.pinchStart();
    });

    // Max Zoom
    act(() => {
      if (mockGestureCallbacks.pinchUpdate) mockGestureCallbacks.pinchUpdate({ scale: 100 });
    });
    expect(getByTestId('camera-view').props.zoom).toBe(1);

    // Min Zoom
    act(() => {
      if (mockGestureCallbacks.pinchUpdate) mockGestureCallbacks.pinchUpdate({ scale: 0.00001 });
    });
    expect(getByTestId('camera-view').props.zoom).toBe(0);
  });

  it('handles Double Tap', () => {
    const { getByTestId } = render(<CameraScreen />);

    act(() => {
      if (mockGestureCallbacks.tapEnd) mockGestureCallbacks.tapEnd();
    });

    expect(getByTestId('camera-view').props.facing).toBe('front');
  });
});
