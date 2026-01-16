import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import ImagePreviewScreen from '../app/(main layout)/camera/imagePreview'; // Kiểm tra lại đường dẫn import này cho đúng với dự án của bạn
import { Image } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

// [QUAN TRỌNG]: Import router trực tiếp để assert (kiểm tra hàm replace có được gọi không)
import { router } from 'expo-router';

/* ========================================================================== */
/* 1. GLOBAL MOCKS & SETUP                                                    */
/* ========================================================================== */

// [FIX LỖI ROUTER]: Mock expo-router ngay tại đây để tránh lỗi Hoisting
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ uri: 'file://temp/captured-image.jpg' }),
  // Định nghĩa object router và các hàm giả (mock functions) bên trong
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
}));

// --- MOCK NAV ACTION CONTEXT ---
const mockSetAction = jest.fn();
const mockResetAction = jest.fn();

jest.mock('@/context/NavActionContext', () => ({
  useBottomAction: () => ({
    setAction: mockSetAction,
    resetAction: mockResetAction,
  }),
}));

// --- MOCK CALENDAR HOOK ---
const mockLoadEvents = jest.fn();
let mockEventsData: any[] = [];
let mockLoading = false;

jest.mock('@/app/services/useUnifiedCalendar', () => ({
  useUnifiedCalendar: () => ({
    events: mockEventsData,
    loading: mockLoading,
    loadEvents: mockLoadEvents,
  }),
}));

// --- MOCK PHOTO CACHE UTILS ---
jest.mock('@/utils/photoCache', () => ({
  addPhotoToCache: jest.fn(),
  PhotoItem: {},
}));

// --- MOCK EXPO-MEDIA-LIBRARY ---
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn(),
}));

// --- MOCK LUCIDE ICONS ---
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    BookOpen: () => <View testID="icon-book-open" />,
    BookText: () => <View testID="icon-book-text" />,
    Check: () => <View testID="icon-check" />,
    Download: () => <View testID="icon-download" />,
    X: () => <View testID="icon-x" />,
    Image: () => <View testID="icon-image" />,
    ActivityIndicator: () => <View testID="icon-spinner" />,
  };
});

// --- MOCK FILE SYSTEM (Class-based Mock) ---
const mockCopy = jest.fn();
const mockWrite = jest.fn();
const mockCreate = jest.fn();
const mockExists = jest.fn().mockReturnValue(true);

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    exists = true;
    constructor(parentOrPath: any, name?: string) {
      if (name) {
        // Xử lý ghép đường dẫn an toàn
        const parentUri = typeof parentOrPath === 'string' ? parentOrPath : parentOrPath.uri;
        this.uri = (parentUri || 'file://root') + '/' + name;
      } else {
        this.uri = parentOrPath;
      }
    }
    copy = mockCopy;
    write = mockWrite;
  }

  class MockDirectory {
    uri: string;
    exists = true;
    constructor(parentOrPath: any, name?: string) {
      this.exists = mockExists();
      const parentUri = typeof parentOrPath === 'string' ? parentOrPath : parentOrPath.uri;
      if (name) {
        this.uri = (parentUri || 'file://root') + '/' + name;
      } else {
        this.uri = parentOrPath;
      }
    }
    create = mockCreate;
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: 'file://docs' },
  };
});

// --- MOCK ALERT COMPONENT ---
jest.mock('@/components/Alert', () => {
    const { Text, View } = jest.requireActual('react-native');
    return {
        Alert: ({ visible, message }: any) => visible ? <View><Text>{message}</Text></View> : null
    }
});


/* ========================================================================== */
/* 2. TEST SUITE                                                              */
/* ========================================================================== */

describe('ImagePreviewScreen', () => {
  const NOW = new Date('2024-01-01T09:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.clearAllMocks();
    
    // Reset state giả lập
    mockEventsData = [];
    mockLoading = false;
    mockExists.mockReturnValue(true);
    
    // [QUAN TRỌNG]: Clear history gọi hàm của router.replace
    (router.replace as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /* ------------------------------------------------------------------------ */
  /* TEST RENDERING & NAVIGATION                                              */
  /* ------------------------------------------------------------------------ */

  it('renders image and sets up bottom action', async () => {
    const { UNSAFE_getByType } = render(<ImagePreviewScreen />);

    // Kiểm tra ảnh hiển thị đúng URI mock
    const image = UNSAFE_getByType(Image);
    expect(image.props.source).toEqual({ uri: 'file://temp/captured-image.jpg' });

    // Kiểm tra hook loadEvents được gọi
    expect(mockLoadEvents).toHaveBeenCalled();

    // Kiểm tra Bottom Action (nút Save) được setup
    await waitFor(() => {
      expect(mockSetAction).toHaveBeenCalled();
      // Lấy tham số gọi hàm lần đầu tiên, kiểm tra icon
      const actionConfig = mockSetAction.mock.calls[0][0];
      expect(actionConfig.icon).toBeDefined(); 
    });
  });

  it('navigates back to camera when Discard (X) is pressed', () => {
    const { getByTestId } = render(<ImagePreviewScreen />);
    
    // Tìm nút X
    const xIcon = getByTestId('icon-x');
    // Bấm vào parent (TouchableOpacity)
    fireEvent.press(xIcon.parent as any);

    // [ASSERT]: Kiểm tra router.replace có được gọi với '/camera' không
    expect(router.replace).toHaveBeenCalledWith('/camera');
  });

  it('shows loading spinner in bottom action when calendar is loading', () => {
    mockLoading = true;
    render(<ImagePreviewScreen />);
    
    // Khi loading, setAction được gọi với icon spinner
    expect(mockSetAction).toHaveBeenCalledWith(expect.objectContaining({
        icon: expect.anything() // Icon spinner mock (View)
    }));
  });

  /* ------------------------------------------------------------------------ */
  /* TEST NOTE FUNCTIONALITY                                                  */
  /* ------------------------------------------------------------------------ */

  it('allows user to add and toggle note', () => {
    const { getByPlaceholderText, queryByPlaceholderText, getByTestId } = render(<ImagePreviewScreen />);

    // Mặc định Input Note ẩn
    expect(queryByPlaceholderText('Add a note for this photo...')).toBeNull();

    // 1. Mở Note
    const bookIcon = getByTestId('icon-book-text');
    fireEvent.press(bookIcon.parent as any);

    // 2. Input hiện ra
    const input = getByPlaceholderText('Add a note for this photo...');
    expect(input).toBeTruthy();

    // 3. Nhập text
    fireEvent.changeText(input, 'My important note');

    // 4. Đóng Note
    const checkIcon = getByTestId('icon-check');
    fireEvent.press(checkIcon.parent as any);

    // 5. Input ẩn đi
    expect(queryByPlaceholderText('Add a note for this photo...')).toBeNull();
  });

  /* ------------------------------------------------------------------------ */
  /* TEST SAVE PHOTO LOGIC (CORE)                                             */
  /* ------------------------------------------------------------------------ */

  // Helper function: Giả lập bấm nút Save ở dưới đáy màn hình
  const triggerSaveAction = () => {
    // Lấy config action cuối cùng được setAction
    const calls = mockSetAction.mock.calls;
    if (calls.length === 0) return;
    
    const lastCall = calls[calls.length - 1];
    const { onPress } = lastCall[0];
    
    // Thực thi hàm onPress (Save)
    act(() => {
        onPress();
    });
  };

  it('saves photo to "Unorganized" folder when no events match', async () => {
    mockEventsData = []; // Không có lịch học
    render(<ImagePreviewScreen />);

    // Chờ setAction (nút Save hiện ra)
    await waitFor(() => expect(mockSetAction).toHaveBeenCalled());

    // Bấm Save
    triggerSaveAction();

    // 1. Kiểm tra File System Copy: URI đích phải chứa 'Unorganized'
    expect(mockCopy).toHaveBeenCalledWith(expect.objectContaining({
        uri: expect.stringContaining('Unorganized')
    }));

    // 2. Kiểm tra JSON Metadata ghi file
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"folder": "Unorganized"'));
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"session": "2024-01-01"'));

    // 3. Kiểm tra thông báo thành công (Set icon Check)
    await waitFor(() => {
        expect(mockSetAction).toHaveBeenCalledWith(expect.objectContaining({
            icon: expect.anything()
        }));
    });

    // 4. Kiểm tra điều hướng về Camera sau 1.5s
    act(() => {
        jest.runAllTimers(); 
    });
    expect(router.replace).toHaveBeenCalledWith('/camera');
  });

  it('saves photo to "Math Class" folder when event matches', async () => {
    // Setup: Lịch học trùng giờ hiện tại
    mockEventsData = [{
        title: 'Math Class',
        startDate: '2024-01-01T08:00:00.000Z',
        endDate: '2024-01-01T10:00:00.000Z'
    }];

    render(<ImagePreviewScreen />);
    await waitFor(() => expect(mockSetAction).toHaveBeenCalled());

    triggerSaveAction();

    // Verify folder đích là tên môn học
    expect(mockCopy).toHaveBeenCalledWith(expect.objectContaining({
        uri: expect.stringContaining('Math Class')
    }));

    // Verify JSON Metadata
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"folder": "Math Class"'));
  });

  it('includes note in metadata when saving', async () => {
    mockEventsData = [];
    const { getByTestId, getByPlaceholderText } = render(<ImagePreviewScreen />);

    // Mở note và nhập
    fireEvent.press(getByTestId('icon-book-text').parent as any);
    fireEvent.changeText(getByPlaceholderText('Add a note for this photo...'), 'Exam review');
    
    // Save
    await waitFor(() => expect(mockSetAction).toHaveBeenCalled());
    triggerSaveAction();

    // Verify JSON có chứa note
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('"note": "Exam review"'));
  });

  it('creates directories if they do not exist', async () => {
    // Setup: Folder chưa tồn tại
    mockExists.mockReturnValue(false);
    
    render(<ImagePreviewScreen />);
    await waitFor(() => expect(mockSetAction).toHaveBeenCalled());
    triggerSaveAction();

    // Phải gọi lệnh create directory 2 lần (Photos root + Folder môn)
    expect(mockCreate).toHaveBeenCalledTimes(2); 
  });

  /* ------------------------------------------------------------------------ */
  /* TEST ERROR HANDLING                                                      */
  /* ------------------------------------------------------------------------ */

  it('shows error alert if saving fails', async () => {
    // Setup: Copy file bị lỗi (ví dụ hết bộ nhớ)
    mockCopy.mockImplementationOnce(() => {
        throw new Error('Disk full');
    });

    // Tắt console error để không làm bẩn màn hình test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(<ImagePreviewScreen />);
    await waitFor(() => expect(mockSetAction).toHaveBeenCalled());

    triggerSaveAction();

    // Verify Alert hiển thị thông báo lỗi
    await waitFor(() => {
        expect(getByText('Failed to save photo')).toBeTruthy();
    });

    // Verify Bottom Action chuyển sang icon X (Error)
    expect(mockSetAction).toHaveBeenCalledWith(expect.objectContaining({
        onPress: expect.any(Function)
    }));

    spy.mockRestore();
  });
});