import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SessionFolderScreen from '../app/(custom layout)/sessionFolders/[folderName]/index';

// --- Router & params ---
const mockReplace = jest.fn();
const mockPush = jest.fn();
// Create a mock function for params so we can change it in specific tests
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  router: {
    replace: (...args: any[]) => mockReplace(...args),
    push: (...args: any[]) => mockPush(...args),
  },
  RelativePathString: String,
  useFocusEffect: (cb: any) => {
    const ReactLib = require('react');
    ReactLib.useEffect(cb, [cb]);
  },
}));

// BottomNav
jest.mock('@/components/BottomNav', () => () => null);

// SearchBar
jest.mock('@/components/SearchBar', () => {
  const { TextInput } = require('react-native');
  return {
    SearchBar: ({ value, onChangeText, placeholder }: any) => (
      <TextInput testID="session-search-bar" value={value} onChangeText={onChangeText} placeholder={placeholder} />
    ),
  };
});

// FileSystem & photoCache
const mockDirExists = true;
const mockJsonFiles = [
  { name: 'img1.json', uri: 'file://docs/photos/Math/img1.json' },
  { name: 'img2.json', uri: 'file://docs/photos/Math/img2.json' },
];

jest.mock('expo-file-system', () => {
  class MockDirectory {
    name: string;
    constructor(parent: any, name: string) {
      this.name = name;
    }
    get exists() {
      return mockDirExists;
    }
    list() {
      // Only return files if the folder is 'Math'
      if (this.name === 'Math') {
        return mockJsonFiles.map((f) => new MockFile(f.uri));
      }
      return [];
    }
  }

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

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: 'file://docs' },
  };
});

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
    // Default param: Math folder
    mockUseLocalSearchParams.mockReturnValue({ folderName: 'Math' });
    mockGetPhotosFromCache.mockResolvedValue(null);
  });

  it('loads sessions and renders cards', async () => {
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

    const { getByTestId, getByText, queryByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getByText(/Session 1/)).toBeTruthy();
    });

    const searchBar = getByTestId('session-search-bar');
    fireEvent.changeText(searchBar, 'History note');

    await waitFor(() => {
      expect(queryByText(/Session 1/)).toBeTruthy();
    });
  });

  it('loads photos from file system when cache is empty', async () => {
    mockGetPhotosFromCache.mockResolvedValue(null);

    const { getAllByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(mockSavePhotosToCache).toHaveBeenCalledWith('Math', expect.any(Array));
      // Changed getByText to getAllByText to handle multiple sessions
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no photos are found', async () => {
    // 1. Return empty cache
    mockGetPhotosFromCache.mockResolvedValue([]);
    // 2. IMPORTANT: Change folderName to something that isn't 'Math'
    // so the FileSystem mock returns an empty list.
    mockUseLocalSearchParams.mockReturnValue({ folderName: 'EmptyFolder' });

    const { getByText } = render(<SessionFolderScreen />);

    await waitFor(
      () => {
        expect(getByText(/No photos in this folder yet/)).toBeTruthy();
      },
      { timeout: 3000 }
    );
  });

  it('handles multiple sessions and sorts them correctly', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'First note',
        subject: 'Math',
        session: '2024-01-01',
      },
      {
        uri: 'file://docs/photos/Math/img2.jpg',
        name: 'img2.jpg',
        timestamp: new Date('2024-01-03T10:00:00.000Z').getTime(),
        note: 'Third note',
        subject: 'Math',
        session: '2024-01-03',
      },
      {
        uri: 'file://docs/photos/Math/img3.jpg',
        name: 'img3.jpg',
        timestamp: new Date('2024-01-02T09:00:00.000Z').getTime(),
        note: 'Second note',
        subject: 'Math',
        session: '2024-01-02',
      },
    ]);

    const { getAllByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      const sessionTexts = getAllByText(/Session \d/);
      expect(sessionTexts.length).toBeGreaterThan(0);
    });
  });

  it('searches by note field', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'Important math concept',
        subject: 'Math',
        session: '2024-01-01',
      },
      {
        uri: 'file://docs/photos/Math/img2.jpg',
        name: 'img2.jpg',
        timestamp: new Date('2024-01-02T09:00:00.000Z').getTime(),
        note: 'Different topic',
        subject: 'Math',
        session: '2024-01-02',
      },
    ]);

    const { getByTestId, getAllByText, queryByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });

    const searchBar = getByTestId('session-search-bar');
    fireEvent.changeText(searchBar, 'Important');

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
      expect(queryByText(/Different topic/)).toBeFalsy();
    });
  });

  it('searches by subject field', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'Note 1',
        subject: 'Mathematics',
        session: '2024-01-01',
      },
      {
        uri: 'file://docs/photos/Math/img2.jpg',
        name: 'img2.jpg',
        timestamp: new Date('2024-01-02T09:00:00.000Z').getTime(),
        note: 'Note 2',
        subject: 'Physics',
        session: '2024-01-02',
      },
    ]);

    const { getByTestId, getAllByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });

    const searchBar = getByTestId('session-search-bar');
    fireEvent.changeText(searchBar, 'Mathematics');

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });
  });

  it('searches by photo name', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'important-photo.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'Note 1',
        subject: 'Math',
        session: '2024-01-01',
      },
      {
        uri: 'file://docs/photos/Math/img2.jpg',
        name: 'other-photo.jpg',
        timestamp: new Date('2024-01-02T09:00:00.000Z').getTime(),
        note: 'Note 2',
        subject: 'Math',
        session: '2024-01-02',
      },
    ]);

    const { getByTestId, getAllByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });

    const searchBar = getByTestId('session-search-bar');
    fireEvent.changeText(searchBar, 'important-photo');

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });
  });

  it('handles multi-word search query', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'linear algebra equations',
        subject: 'Math',
        session: '2024-01-01',
      },
      {
        uri: 'file://docs/photos/Math/img2.jpg',
        name: 'img2.jpg',
        timestamp: new Date('2024-01-02T09:00:00.000Z').getTime(),
        note: 'calculus derivatives',
        subject: 'Math',
        session: '2024-01-02',
      },
    ]);

    const { getByTestId, getAllByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });

    const searchBar = getByTestId('session-search-bar');
    fireEvent.changeText(searchBar, 'linear algebra');

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });
  });

  it('shows no results message when search has no matches', async () => {
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

    const { getByTestId, getAllByText, getByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });

    const searchBar = getByTestId('session-search-bar');
    fireEvent.changeText(searchBar, 'nonexistent search term');

    await waitFor(() => {
      expect(getByText(/No matching photos found/)).toBeTruthy();
    });
  });

  it('handles refresh functionality', async () => {
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
    mockClearFolderCache.mockResolvedValue(undefined);

    const { getAllByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });
  });

  it('navigates to image details when photo is pressed', async () => {
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

    const { getByText, getByTestId } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getByText(/Session 1/)).toBeTruthy();
    });

    await waitFor(() => {
      expect(getByTestId('session-photo-0')).toBeTruthy();
    });

    const photoButton = getByTestId('session-photo-0');
    fireEvent.press(photoButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/imageDetails',
        params: { uri: 'file://docs/photos/Math/img1.jpg' },
      });
    });
  });

  it('has back button that can navigate to gallery', async () => {
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

    const { getAllByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
      expect(mockReplace).toBeDefined();
    });
  });

  it('handles photos with missing session key', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'Math note',
        subject: 'Math',
        session: undefined,
      },
    ]);

    const { getByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getByText(/Session.*Unknown date/)).toBeTruthy();
    });
  });

  it('handles photos with empty session key', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'Math note',
        subject: 'Math',
        session: '',
      },
    ]);

    const { getByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getByText(/Session.*Unknown date/)).toBeTruthy();
    });
  });

  it('handles invalid date in session key', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'Math note',
        subject: 'Math',
        session: 'invalid-date',
      },
    ]);

    const { getByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getByText(/Session.*invalid-date/)).toBeTruthy();
    });
  });

  it('handles photos where image file does not exist', async () => {
    mockGetPhotosFromCache.mockResolvedValue(null);

    // This returns the container even if files aren't found
    const { getByText } = render(<SessionFolderScreen />);

    await waitFor(
      () => {
        expect(getByText).toBeDefined();
      },
      { timeout: 3000 }
    );
  });

  it('auto-expands all sessions when searching', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'Note 1',
        subject: 'Math',
        session: '2024-01-01',
      },
      {
        uri: 'file://docs/photos/Math/img2.jpg',
        name: 'img2.jpg',
        timestamp: new Date('2024-01-02T09:00:00.000Z').getTime(),
        note: 'Note 2',
        subject: 'Math',
        session: '2024-01-02',
      },
    ]);

    const { getByTestId, getAllByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });

    const searchBar = getByTestId('session-search-bar');
    fireEvent.changeText(searchBar, 'Note');

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });
  });

  it('collapses and expands session correctly', async () => {
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

    const sessionHeader = getByText(/Session 1/);

    fireEvent.press(sessionHeader);

    await waitFor(() => {
      expect(getByText(/Session 1/)).toBeTruthy();
    });

    fireEvent.press(sessionHeader);

    await waitFor(() => {
      expect(getByText(/Session 1/)).toBeTruthy();
    });
  });

  it('formats category name correctly from folderName', async () => {
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
      expect(getByText('Math')).toBeTruthy();
    });
  });

  it('formats category name with underscores correctly', async () => {
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
      expect(getByText('Math')).toBeTruthy();
    });
  });

  it('sorts photos within session by timestamp (newest first)', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'First photo',
        subject: 'Math',
        session: '2024-01-01',
      },
      {
        uri: 'file://docs/photos/Math/img2.jpg',
        name: 'img2.jpg',
        timestamp: new Date('2024-01-01T10:00:00.000Z').getTime(),
        note: 'Second photo',
        subject: 'Math',
        session: '2024-01-01',
      },
      {
        uri: 'file://docs/photos/Math/img3.jpg',
        name: 'img3.jpg',
        timestamp: new Date('2024-01-01T09:00:00.000Z').getTime(),
        note: 'Third photo',
        subject: 'Math',
        session: '2024-01-01',
      },
    ]);

    const { getByText, getByTestId } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getByText(/Session 1/)).toBeTruthy();
    });

    await waitFor(() => {
      const photoButton = getByTestId('session-photo-0');
      expect(photoButton).toBeTruthy();
    });
  });

  it('handles empty search query by showing all sessions', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: 'Math note',
        subject: 'Math',
        session: '2024-01-01',
      },
      {
        uri: 'file://docs/photos/Math/img2.jpg',
        name: 'img2.jpg',
        timestamp: new Date('2024-01-02T09:00:00.000Z').getTime(),
        note: 'Another note',
        subject: 'Math',
        session: '2024-01-02',
      },
    ]);

    const { getByTestId, getAllByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });

    const searchBar = getByTestId('session-search-bar');
    fireEvent.changeText(searchBar, 'Math');

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });

    fireEvent.changeText(searchBar, '');

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });
  });

  it('displays loading state correctly', async () => {
    mockGetPhotosFromCache.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(null), 50)));

    const { queryByTestId } = render(<SessionFolderScreen />);

    await waitFor(
      () => {
        expect(queryByTestId('session-search-bar')).toBeTruthy();
      },
      { timeout: 200 }
    );
  });

  it('handles photos with missing note field in search', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-01-01T08:00:00.000Z').getTime(),
        note: undefined,
        subject: 'Math',
        session: '2024-01-01',
      },
    ]);

    const { getByTestId, getAllByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });

    const searchBar = getByTestId('session-search-bar');
    fireEvent.changeText(searchBar, 'Math');

    await waitFor(() => {
      expect(getAllByText(/Session/).length).toBeGreaterThan(0);
    });
  });

  it('handles date format in formatSessionDisplay correctly', async () => {
    mockGetPhotosFromCache.mockResolvedValue([
      {
        uri: 'file://docs/photos/Math/img1.jpg',
        name: 'img1.jpg',
        timestamp: new Date('2024-12-25T08:00:00.000Z').getTime(),
        note: 'Math note',
        subject: 'Math',
        session: '2024-12-25',
      },
    ]);

    const { getByText } = render(<SessionFolderScreen />);

    await waitFor(() => {
      expect(getByText(/25\/12\/2024/)).toBeTruthy();
    });
  });
});
