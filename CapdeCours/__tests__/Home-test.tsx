import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';
import { Image } from 'react-native';
import * as Calendar from 'expo-calendar';
import { clearFolderCache, updateCacheAfterMove } from '@/utils/photoCache';
import { getData } from '@/utils/asyncStorage';
import { File } from 'expo-file-system'; // Import để dùng type hoặc class trong test

/* ========================================================================== */
/* 1. GLOBAL MOCKS & SETUP                                                    */
/* ========================================================================== */

// Mock các hàm của File System để theo dõi
const mockMove = jest.fn();
const mockWrite = jest.fn();
const mockCreate = jest.fn();
const mockList = jest.fn().mockReturnValue([]); // Mặc định trả về rỗng
const mockText = jest.fn().mockResolvedValue('{}');
const mockExists = jest.fn().mockReturnValue(true);

// --- MOCK EXPO-FILE-SYSTEM ---
jest.mock('expo-file-system', () => {
  // Định nghĩa Mock Class
  class MockFile {
    name: string;
    uri: string;
    exists = true;

    constructor(parentOrPath: any, name?: string) {
      if (name) {
        this.name = name;
        // Xử lý logic ghép đường dẫn đơn giản
        const parentUri = typeof parentOrPath === 'string' ? parentOrPath : parentOrPath.uri;
        this.uri = (parentUri || 'file://root') + '/' + name;
      } else {
        this.name = 'test.jpg';
        this.uri = 'file://test.jpg';
      }
    }
    move = mockMove;
    write = mockWrite;
    text = mockText;
  }

  class MockDirectory {
    exists = true;
    uri = 'file://photos';

    constructor(parentOrPath: any, name?: string) {
      this.exists = mockExists(); // Link với mock function để điều khiển từ bên ngoài

      const parentUri = typeof parentOrPath === 'string' ? parentOrPath : parentOrPath?.uri;
      if (name) {
        this.uri = (parentUri || 'file://root') + '/' + name;
      } else if (typeof parentOrPath === 'string') {
        this.uri = parentOrPath;
      }
    }
    create = mockCreate;
    list = mockList;
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: 'file://docs' },
  };
});

// --- MOCK NAVIGATION ---
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return {
    useFocusEffect: (cb: any) => React.useEffect(cb, [cb]),
  };
});

// --- MOCK CALENDAR HOOK (Data UI) ---
const mockLoadEvents = jest.fn();
// Dữ liệu mẫu mặc định cho hook
const defaultMockEvents = [
  {
    id: '1',
    title: 'Math Class',
    startDate: '2024-01-01T08:00:00.000Z',
    endDate: '2024-01-01T10:00:00.000Z',
    location: 'Room 101',
    source: 'LOCAL',
    color: '#AC3C00',
  },
];

jest.mock('@/app/services/useUnifiedCalendar', () => ({
  useUnifiedCalendar: () => ({
    events: defaultMockEvents, // Trả về biến global này để dễ assert
    loading: false,
    loadEvents: mockLoadEvents,
  }),
}));

// --- MOCK EXTERNAL SERVICES ---
jest.mock('@/utils/asyncStorage', () => ({
  getData: jest.fn(),
}));

jest.mock('@/app/services/localCalendarService', () => ({
  getLocalUnifiedEventsInRange: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/app/services/calenderApi', () => ({
  calendarApi: {
    getAll: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/utils/photoCache', () => ({
  clearFolderCache: jest.fn(),
  updateCacheAfterMove: jest.fn(),
}));

jest.mock('expo-calendar', () => ({
  getEventsAsync: jest.fn(),
}));

// --- MOCK UI COMPONENTS ---
jest.mock('lucide-react-native', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    CalendarPlus: (props: any) => <Text {...props}>AddEventIcon</Text>,
  };
});

// --- MOCK DATE-FNS (Fix Timezone) ---
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    format: (date: Date | number, fmt: string) => {
      // Mock giờ cố định (UTC) để snapshot không bị lệch múi giờ
      if (fmt === 'HH:mm') {
        const d = new Date(date);
        return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
      }
      return actual.format(date, fmt);
    },
  };
});

/* ========================================================================== */
/* 2. TEST SUITE                                                              */
/* ========================================================================== */

describe('Home Screen - Full Coverage', () => {
  const NOW = new Date('2024-01-01T09:00:00.000Z'); // Giả lập thời gian hiện tại

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.clearAllMocks();

    // Reset default return values
    mockExists.mockReturnValue(true);
    mockList.mockReturnValue([]);
    (getData as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /* ---------- UI BASIC ---------- */

  it('renders correctly and loads schedule', async () => {
    const { getByText } = render(<Home />);

    expect(getByText('Welcome back!')).toBeTruthy();
    expect(mockLoadEvents).toHaveBeenCalled();

    await waitFor(() => {
      expect(getByText('Math Class')).toBeTruthy();
      expect(getByText('08:00')).toBeTruthy();
    });
  });

  it('handles navigation to add event', () => {
    const { getByText } = render(<Home />);
    fireEvent.press(getByText('AddEventIcon'));
    expect(mockPush).toHaveBeenCalledWith('/(main layout)/schedule/addEvent');
  });

  /* ---------- UNORGANIZED IMAGES DISPLAY ---------- */

  it('shows unorganized images banner when files exist', async () => {
    // SETUP: Tạo File instance từ mock
    // Dùng require để lấy đúng Class đã mock
    const { File: MockFileClass } = require('expo-file-system');
    const file1 = new MockFileClass('docs', 'img1.jpg');

    // Mock list trả về file này
    mockList.mockReturnValue([file1]);

    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('Classify unorganized images now!')).toBeTruthy();
      expect(getByText('View 1 unorganized images')).toBeTruthy();
    });
  });

  it('hides banner if no images found', async () => {
    mockList.mockReturnValue([]);
    const { getByText } = render(<Home />);
    await waitFor(() => {
      expect(getByText('All images are organized!')).toBeTruthy();
    });
  });

  it('navigates to image detail', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const file1 = new MockFileClass('docs', 'img1.jpg');
    mockList.mockReturnValue([file1]);

    const { UNSAFE_getAllByType } = render(<Home />);

    await waitFor(() => expect(UNSAFE_getAllByType(Image).length).toBeGreaterThan(0));

    const images = UNSAFE_getAllByType(Image);
    // Click vào Image (hoặc parent Touchable)
    fireEvent.press(images[0].parent as any);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/imageDetails',
      params: { uri: expect.stringContaining('img1.jpg') },
    });
  });

  /* ---------- AUTO CLASSIFY LOGIC (CRITICAL) ---------- */

  it('successfully auto-classifies matched images', async () => {
    /* SCENARIO:
       - 1 ảnh chụp lúc 08:30
       - Lịch có sự kiện "Math Class" lúc 08:00 - 10:00
       - Mong đợi: Ảnh được move vào folder "Math Class"
    */

    // 1. Setup Files
    const { File: MockFileClass } = require('expo-file-system');
    const imgFile = new MockFileClass('docs', 'photo.jpg');

    mockList.mockReturnValue([imgFile]); // Trả về ảnh

    // Mock metadata JSON time trùng khớp
    mockText.mockResolvedValue(
      JSON.stringify({
        time: '2024-01-01T08:30:00.000Z',
        folder: 'Unorganized',
      })
    );

    // 2. Setup Calendar (Native)
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(['cal1']));
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValue([
      {
        id: 'native_1',
        title: 'Math Class',
        startDate: '2024-01-01T08:00:00.000Z',
        endDate: '2024-01-01T10:00:00.000Z',
        calendarId: 'cal1',
      },
    ]);

    // 3. Render
    const { getByText } = render(<Home />);

    // Chờ nút hiện ra
    await waitFor(() => expect(getByText('Auto classify these images')).toBeTruthy());

    // 4. Act
    await act(async () => {
      fireEvent.press(getByText('Auto classify these images'));
    });

    // 5. Assert
    await waitFor(() => {
      // Kiểm tra move file
      expect(mockMove).toHaveBeenCalled();

      // SỬA DÒNG NÀY: Dùng Regex để chấp nhận dấu cách do JSON pretty print tạo ra
      // /"folder":\s*"Math Class"/ nghĩa là: "folder": (khoảng trắng tùy ý) "Math Class"
      expect(mockWrite).toHaveBeenCalledWith(expect.stringMatching(/"folder":\s*"Math Class"/));

      // Kiểm tra update cache
      expect(updateCacheAfterMove).toHaveBeenCalledWith('Unorganized', 'Math Class', expect.any(String), expect.objectContaining({ subject: 'Math Class' }));
    });
  });

  it('does not move files if no event matches', async () => {
    // 1. Setup: Ảnh chụp lúc 12:00 (không có lịch)
    const { File: MockFileClass } = require('expo-file-system');
    const imgFile = new MockFileClass('docs', 'lunch.jpg');

    mockList.mockReturnValue([imgFile]);
    mockText.mockResolvedValue(JSON.stringify({ time: '2024-01-01T12:00:00.000Z' }));

    // Mock Calendar trả về rỗng
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(['cal1']));
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValue([]);

    const { getByText } = render(<Home />);
    await waitFor(() => expect(getByText('Auto classify these images')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Auto classify these images'));
    });

    // Expect: Không có lệnh move nào
    expect(mockMove).not.toHaveBeenCalled();
  });

  /* ---------- ERROR HANDLING ---------- */

  it('handles errors gracefully (file corrupted)', async () => {
    // 1. Setup
    const { File: MockFileClass } = require('expo-file-system');

    // QUAN TRỌNG: Tạo instance từ Class Mock để vượt qua check `instanceof File` trong Home.tsx
    const errorFile = new MockFileClass('docs', 'error.jpg');
    mockList.mockReturnValue([errorFile]);

    // Giả lập lỗi khi đọc file JSON
    mockText.mockRejectedValue(new Error('Corrupted File'));

    // Spy console để không in lỗi ra terminal
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { getByText } = render(<Home />);

    // 2. Wait for button
    await waitFor(() => {
      // Lúc này mockList trả về [errorFile], nên nút phải hiện
      expect(getByText('Auto classify these images')).toBeTruthy();
    });

    // 3. Press
    fireEvent.press(getByText('Auto classify these images'));

    // 4. Assert
    // App không crash, và không gọi move do lỗi đọc metadata
    expect(mockMove).not.toHaveBeenCalled();

    // Cleanup
    spy.mockRestore();
  });

  // --- ADDITIONAL EDGE CASE TESTS FOR INCREASED COVERAGE ---

  it('handles auto-classify with multiple events matching same photo time', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const imgFile = new MockFileClass('docs', 'photo.jpg');

    mockList.mockReturnValue([imgFile]);

    mockText.mockResolvedValue(
      JSON.stringify({
        time: '2024-01-01T09:30:00.000Z',
        folder: 'Unorganized',
      })
    );

    // Mock multiple events at the same time
    (getData as jest.Mock).mockResolvedValue(JSON.stringify(['cal1']));
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValue([
      {
        id: 'native_1',
        title: 'Math Class',
        startDate: '2024-01-01T09:00:00.000Z',
        endDate: '2024-01-01T10:30:00.000Z',
        calendarId: 'cal1',
      },
      {
        id: 'native_2',
        title: 'Physics Class',
        startDate: '2024-01-01T09:15:00.000Z',
        endDate: '2024-01-01T10:45:00.000Z',
        calendarId: 'cal1',
      },
    ]);

    const { getByText } = render(<Home />);

    await waitFor(() => expect(getByText('Auto classify these images')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Auto classify these images'));
    });

    // Should find first matching event
    expect(mockMove).toHaveBeenCalled();
  });

  it('handles auto-classify with events having no title', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const imgFile = new MockFileClass('docs', 'photo.jpg');

    mockList.mockReturnValue([imgFile]);

    mockText.mockResolvedValue(
      JSON.stringify({
        time: '2024-01-01T09:30:00.000Z',
        folder: 'Unorganized',
      })
    );

    (getData as jest.Mock).mockResolvedValue(JSON.stringify(['cal1']));
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValue([
      {
        id: 'native_1',
        title: '',
        startDate: '2024-01-01T09:00:00.000Z',
        endDate: '2024-01-01T10:30:00.000Z',
        calendarId: 'cal1',
      },
    ]);

    const { getByText } = render(<Home />);

    await waitFor(() => expect(getByText('Auto classify these images')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Auto classify these images'));
    });

    // Should not move if title is empty
    expect(mockMove).not.toHaveBeenCalled();
  });

  it('handles auto-classify with corrupted metadata gracefully', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const imgFile = new MockFileClass('docs', 'photo.jpg');

    mockList.mockReturnValue([imgFile]);

    mockText.mockResolvedValue('invalid json');

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('Auto classify these images')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Auto classify these images'));
    });

    // Should not crash and should log warning
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockMove).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('handles loading images with permission denied', async () => {
    mockList.mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('All images are organized!')).toBeTruthy();
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles date selection change', async () => {
    const { getAllByText } = render(<Home />);

    // Find and click a different day (use getAllByText to get all day numbers)
    const dayButtons = getAllByText(/\d+/);
    if (dayButtons.length > 0) {
      fireEvent.press(dayButtons[0]);
    }

    // Should reload events for new date
    expect(mockLoadEvents).toHaveBeenCalled();
  });
  it('handles unorganized directory not existing', async () => {
    mockExists.mockReturnValue(false);

    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('All images are organized!')).toBeTruthy();
    });
  });

  it('handles mixed image file extensions', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const img1 = new MockFileClass('docs', 'photo1.jpg');
    const img2 = new MockFileClass('docs', 'photo2.jpeg');
    const img3 = new MockFileClass('docs', 'photo3.png');

    mockList.mockReturnValue([img1, img2, img3]);

    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('Classify unorganized images now!')).toBeTruthy();
      expect(getByText('View 3 unorganized images')).toBeTruthy();
    });
  });

  it('handles case-insensitive image extensions', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const img1 = new MockFileClass('docs', 'photo1.JPG');
    const img2 = new MockFileClass('docs', 'photo2.JPEG');
    const img3 = new MockFileClass('docs', 'photo3.PNG');

    mockList.mockReturnValue([img1, img2, img3]);

    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('Classify unorganized images now!')).toBeTruthy();
      expect(getByText('View 3 unorganized images')).toBeTruthy();
    });
  });

  it('handles files without image extensions in unorganized folder', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const file1 = new MockFileClass('docs', 'document.txt');
    const file2 = new MockFileClass('docs', 'data.json');
    const file3 = new MockFileClass('docs', 'video.mp4');

    mockList.mockReturnValue([file1, file2, file3]);

    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('All images are organized!')).toBeTruthy();
    });
  });

  it('handles auto-classify with target folder same as Unorganized', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const imgFile = new MockFileClass('docs', 'photo.jpg');

    mockList.mockReturnValue([imgFile]);

    mockText.mockResolvedValue(
      JSON.stringify({
        time: '2024-01-01T09:30:00.000Z',
        folder: 'Unorganized',
      })
    );

    (getData as jest.Mock).mockResolvedValue(JSON.stringify(['cal1']));
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValue([
      {
        id: 'native_1',
        title: 'Unorganized',
        startDate: '2024-01-01T09:00:00.000Z',
        endDate: '2024-01-01T10:30:00.000Z',
        calendarId: 'cal1',
      },
    ]);

    const { getByText } = render(<Home />);

    await waitFor(() => expect(getByText('Auto classify these images')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Auto classify these images'));
    });

    // Should not move if target folder is Unorganized
    expect(mockMove).not.toHaveBeenCalled();
  });

  it('handles navigate to unorganized folder', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const imgFile = new MockFileClass('docs', 'photo.jpg');

    mockList.mockReturnValue([imgFile]);

    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('View 1 unorganized images')).toBeTruthy();
    });

    fireEvent.press(getByText('View 1 unorganized images'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/sessionFolders/[folderName]',
      params: { folderName: 'Unorganized' },
    });
  });

  it('handles navigate to image details', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const imgFile = new MockFileClass('docs', 'photo.jpg');

    mockList.mockReturnValue([imgFile]);

    const { UNSAFE_getAllByType } = render(<Home />);

    await waitFor(() => {
      const images = UNSAFE_getAllByType(Image);
      if (images.length > 0) {
        const touchable = images[0].parent;
        if (touchable) {
          fireEvent.press(touchable);
        }
      }
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/imageDetails',
      params: { uri: expect.stringContaining('photo.jpg') },
    });
  });

  it('handles auto-classify error in metadata update', async () => {
    const { File: MockFileClass } = require('expo-file-system');
    const imgFile = new MockFileClass('docs', 'photo.jpg');
    const jsonFile = new MockFileClass('docs', 'photo.json');

    mockList.mockReturnValue([imgFile]);

    mockText.mockResolvedValue(
      JSON.stringify({
        time: '2024-01-01T08:30:00.000Z',
        folder: 'Unorganized',
      })
    );

    // Mock move success but write failure
    mockWrite.mockRejectedValue(new Error('Write failed'));

    (getData as jest.Mock).mockResolvedValue(JSON.stringify(['cal1']));
    (Calendar.getEventsAsync as jest.Mock).mockResolvedValue([
      {
        id: 'native_1',
        title: 'Math Class',
        startDate: '2024-01-01T08:00:00.000Z',
        endDate: '2024-01-01T10:00:00.000Z',
        calendarId: 'cal1',
      },
    ]);

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const { getByText } = render(<Home />);

    await waitFor(() => expect(getByText('Auto classify these images')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText('Auto classify these images'));
    });

    // Should log warning but still move files
    expect(mockMove).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

});
