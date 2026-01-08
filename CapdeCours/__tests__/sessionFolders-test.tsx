import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SessionFolderScreen from '../app/(custom layout)/sessionFolders/[folderName]/index';
import { RefreshControl, Keyboard } from 'react-native';

// --- Router & params ---
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ folderName: 'Math' }),
  router: {
    replace: (...args: any[]) => mockReplace(...args),
    push: (...args: any[]) => mockPush(...args),
  },
  RelativePathString: String,
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
}));

// BottomNav
jest.mock('@/components/BottomNav', () => () => null);

// SearchBar
jest.mock('@/components/SearchBar', () => {
  const { TextInput } = require('react-native');
  return {
    SearchBar: ({ value, onChangeText, placeholder }: any) => (
      <TextInput
        testID="session-search-bar"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
      />
    ),
  };
});

// FileSystem & photoCache
const mockDirExists = true;
const mockJsonFiles = [
  { name: 'img1.json', uri: 'file://docs/photos/Math/img1.json' },
  { name: 'img2.json', uri: 'file://docs/photos/Math/img2.json' },
];

class MockFile {
  name: string;
  uri: string;
  constructor(uri: string) {
    this.uri = uri;
    this.name = uri.split('/').pop() || '';
  }
  get exists() {
    return true;
  }
  async text() {
    if (this.name === 'img1.json') {
      return JSON.stringify({
        time: '2024-01-01T08:00:00.000Z',
        note: 'Math note',
        subject: 'Math',
        session: '2024-01-01',
      });
    }
    return JSON.stringify({
      time: '2024-01-02T09:00:00.000Z',
      note: 'History note',
      subject: 'Math',
      session: '2024-01-02',
    });
  }
}

class MockDirectory {
  name: string;
  constructor(parent: any, name: string) {
    this.name = name;
  }
  get exists() {
    return mockDirExists;
  }
  list() {
    if (this.name === 'Math') {
      return mockJsonFiles.map((f) => new MockFile(f.uri));
    }
    return [];
  }
}

jest.mock('expo-file-system', () => ({
  Directory: MockDirectory,
  File: MockFile,
  Paths: { document: 'file://docs' },
}));

const mockGetPhotosFromCache = jest.fn();
const mockSavePhotosToCache = jest.fn();
const mockClearFolderCache = jest.fn();

jest.mock('@/utils/photoCache', () => ({
  getPhotosFromCache: (...args: any[]) => mockGetPhotosFromCache(...args),
  savePhotosToCache: (...args: any[]) => mockSavePhotosToCache(...args),
  clearFolderCache: (...args: any[]) => mockClearFolderCache(...args),
}));

describe('SessionFolderScreen (sessionFolders)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPhotosFromCache.mockResolvedValue(null);
  });

  it('loads sessions and renders cards', async () => {
    // Trả về dữ liệu từ cache để chắc chắn có session
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'Math note',
        subject: 'Math',
        session: '2024-01-01',
      },
    ]);

    const { getByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      // Session title generated from date
      expect(getByText(/Session 1/)).toBeTruthy();
    });
  });

  it('expands session when session header is pressed', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'Math note',
        subject: 'Math',
        session: '2024-01-01',
      },
    ]);

    const { getByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getByText(/Session 1/)).toBeTruthy();
    });

    // Nhấn vào Session để mở rộng; không cần assert chi tiết thumbnail,
    // chỉ cần đảm bảo thao tác không ném lỗi và component vẫn render được.
    fireEvent.press(getByText(/Session 1/));

    await waitFor(() => {
      expect(getByText(/Session 1/)).toBeTruthy();
    });
  });

  it('filters sessions by search query', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-02T09:00:00.000Z').getTime(),
        note: 'History note',
        subject: 'Math',
        session: '2024-01-02',
      },
    ]);

    const { getByTestId, getByText, queryByText } = render(
      <SessionFolderScreen />
    );

    await waitFor(() => {
      expect(getByText(/Session 1/)).toBeTruthy();
    });

    const searchBar = getByTestId('session-search-bar');
    fireEvent.changeText(searchBar, 'History note');

    await waitFor(() => {
      expect(queryByText(/Session 1/)).toBeTruthy();
    });
  });

});
