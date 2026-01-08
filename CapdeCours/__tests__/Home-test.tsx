import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';
import { File } from 'expo-file-system';
import { Image } from 'react-native';

/* ---------------- GLOBAL MOCK STATE ---------------- */
let mockEvents: any[] = [];
let mockLoading = false;
let mockFiles: any[] = [];
let mockDirExists = true;

/* ---------------- ROUTER ---------------- */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

/* ---------------- NAVIGATION FOCUS ---------------- */
jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual('react');
  return {
    useFocusEffect: (cb: any) => {
      React.useEffect(cb, [cb]);
    },
  };
});

/* ---------------- CALENDAR HOOK ---------------- */
const mockLoadEvents = jest.fn();
jest.mock('@/app/services/useUnifiedCalendar', () => ({
  useUnifiedCalendar: () => ({
    events: mockEvents,
    loading: mockLoading,
    loadEvents: mockLoadEvents,
  }),
}));

/* ---------------- FILE SYSTEM ---------------- */
jest.mock('expo-file-system', () => {
  class MockFile {
    name: string;
    uri: string;
    constructor(name: string, uri: string) {
      this.name = name;
      this.uri = uri;
    }
  }

  class MockDirectory {
    exists: boolean;
    constructor() {
      this.exists = mockDirExists;
    }
    list() {
      return mockFiles;
    }
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: 'file://docs' },
  };
});

/* ---------------- ICON ---------------- */
jest.mock('lucide-react-native', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    CalendarPlus: (props: any) => <Text {...props}>AddEventIcon</Text>,
  };
});

/* ---------------- DATE FIX ---------------- */
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    format: (date: Date | number, fmt: string) => {
      if (fmt === 'HH:mm') {
        const d = new Date(date);
        return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
      }
      return actual.format(date, fmt);
    },
  };
});

/* ===================== TESTS ===================== */

describe('Home Screen – 100% coverage', () => {
  const NOW = new Date('2024-01-01T09:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.clearAllMocks();

    mockEvents = [
      {
        id: '1',
        title: 'Math',
        startDate: '2024-01-01T08:00:00.000Z',
        endDate: '2024-01-01T10:00:00.000Z',
        location: 'Room A',
        source: 'LOCAL',
      },
      {
        id: '2',
        title: 'Online Talk',
        startDate: '2024-01-01T13:00:00.000Z',
        endDate: '2024-01-01T14:00:00.000Z',
        location: 'Zoom',
        source: 'REMOTE',
      },
    ];

    mockLoading = false;
    mockDirExists = true;

    // @ts-ignore
    mockFiles = [new File('a.jpg', 'uri/a.jpg'), new File('b.png', 'uri/b.png')];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /* ---------- BASIC RENDER ---------- */
  it('renders header and loads events', async () => {
    const { getByText } = render(<Home />);

    expect(getByText('Welcome back!')).toBeTruthy();
    expect(mockLoadEvents).toHaveBeenCalled();

    await waitFor(() => {
      expect(getByText('Math')).toBeTruthy();
      expect(getByText('Online Talk')).toBeTruthy();
    });
  });

  /* ---------- EMPTY STATE ---------- */
  it('shows empty schedule', async () => {
    mockEvents = [];
    const { getByText } = render(<Home />);

    await waitFor(() => expect(getByText('No classes scheduled for today.')).toBeTruthy());
  });

  /* ---------- LOADING STATE ---------- */
  it('shows loading indicator', () => {
    mockLoading = true;
    const { UNSAFE_getByType } = render(<Home />);
    expect(UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
  });

  /* ---------- DURATION FORMAT ---------- */
  it('formats duration correctly', async () => {
    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText(/2h/)).toBeTruthy();
      expect(getByText(/60m/)).toBeTruthy();
    });
  });

  /* ---------- ADD EVENT ---------- */
  it('navigates to add-event screen', () => {
    const { getByText } = render(<Home />);
    fireEvent.press(getByText('AddEventIcon'));
    expect(mockPush).toHaveBeenCalledWith('/(main layout)/schedule/addEvent');
  });

  /* ---------- WEEK DAY CHANGE ---------- */
  it('reloads when selecting another day', () => {
    const { getByText } = render(<Home />);
    mockLoadEvents.mockClear();

    fireEvent.press(getByText('Tue'));
    expect(mockLoadEvents).toHaveBeenCalled();
  });

  /* ---------- UNORGANIZED IMAGES ---------- */
  it('shows banner with images and count', async () => {
    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('Classify unorganized images now!')).toBeTruthy();
      expect(getByText('View 2 unorganized images')).toBeTruthy();
    });
  });

  it('filters non-image files', async () => {
    // @ts-ignore
    mockFiles = [new File('doc.pdf', 'uri/doc.pdf'), new File('photo.jpg', 'uri/photo.jpg')];

    const { getByText } = render(<Home />);
    await waitFor(() => expect(getByText('View 1 unorganized images')).toBeTruthy());
  });

  it('navigates to image details on image press', async () => {
    const { UNSAFE_getAllByType } = render(<Home />);

    // Image is nested inside TouchableOpacity → press parent
    const images = UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThan(0);

    fireEvent.press(images[0].parent as any);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/imageDetails',
      params: { uri: 'uri/a.jpg' },
    });
  });

  it('navigates to unorganized folder', async () => {
    const { getByText } = render(<Home />);
    await waitFor(() => getByText('View 2 unorganized images'));

    fireEvent.press(getByText('View 2 unorganized images'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/sessionFolders/[folderName]',
      params: { folderName: 'Unorganized' },
    });
  });

  /* ---------- ORGANIZED STATE ---------- */
  it('shows organized message when empty', async () => {
    mockFiles = [];
    const { getByText } = render(<Home />);

    await waitFor(() => {
      expect(getByText('All images are organized!')).toBeTruthy();
      expect(getByText('Great job!')).toBeTruthy();
    });
  });

  it('handles missing directory', async () => {
    mockDirExists = false;
    const { getByText } = render(<Home />);

    await waitFor(() => expect(getByText('All images are organized!')).toBeTruthy());
  });
});
it('handles filesystem error when loading unorganized images', async () => {
  // Force Directory.list() to throw
  mockDirExists = true;

  mockFiles = {
    get length() {
      throw new Error('FS crash');
    },
  } as any;

  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

  const { getByText } = render(<Home />);

  await waitFor(() => {
    expect(getByText('All images are organized!')).toBeTruthy();
  });

  expect(spy).toHaveBeenCalledWith('Error loading unorganized images:', expect.any(Error));

  spy.mockRestore();
});
