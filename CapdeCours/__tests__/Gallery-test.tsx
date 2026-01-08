import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import GalleryScreen from '../app/(main layout)/gallery/index';
import { View, Alert } from 'react-native';

// --- SHARED MOCK STATE ---
const mockFileSystemState: { [key: string]: any[] } = {};

// --- MOCKS ---

// 1. Mock Router
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: { push: (args: any) => mockPush(args) },
    useFocusEffect: (cb: any) => React.useEffect(cb, []),
  };
});

// 2. Mock Components
jest.mock('@/components/Folder', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return ({ title, onEditPress, onDeletePress, link, showActions }: any) => {
    const { router } = require('expo-router');
    return (
      // Thêm testID đặc biệt cho FolderCard để dễ check việc nó bị xóa
      <View testID={`folder-card-${title}`}>
        <TouchableOpacity onPress={() => router.push(link)}>
          <Text>{title}</Text>
        </TouchableOpacity>
        {showActions && (
          <>
            <TouchableOpacity onPress={onEditPress} testID={`edit-${title}`}>
              <Text>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDeletePress} testID={`delete-${title}`}>
              <Text>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };
});

jest.mock('@/components/SearchBar', () => {
  const { TextInput } = jest.requireActual('react-native');
  return {
    SearchBar: ({ value, onChangeText, placeholder }: any) => (
      <TextInput testID="search-bar" value={value} onChangeText={onChangeText} placeholder={placeholder} />
    ),
  };
});

// 3. Mock Photo Cache
jest.mock('@/utils/photoCache', () => ({
  getPhotosFromCache: jest.fn((folder) => {
    if (mockFileSystemState[folder]) {
      return Promise.resolve([
        {
          uri: `file://${folder}/photo1.jpg`,
          name: 'photo1.jpg',
          timestamp: Date.now(),
          folderName: folder,
          note: 'Test Note',
          subject: folder,
        },
      ]);
    }
    return Promise.resolve([]);
  }),
  savePhotosToCache: jest.fn(),
  clearFolderCache: jest.fn(),
  // Hàm rebuildCacheForFolder được định nghĩa trong component, không phải import từ utils
  // nên việc mock ở đây chỉ mang tính dự phòng cho các import khác
}));

// 4. Mock Expo File System
jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    name: string;
    constructor(uri: string, name?: string) {
      this.uri = uri;
      this.name = name || uri.split('/').pop() || '';
    }
    get exists() {
      return true;
    }
    delete = jest.fn();
    move = jest.fn();
    text = jest.fn().mockResolvedValue(JSON.stringify({ note: 'metadata', subject: 'Math' }));
    write = jest.fn();
  }

  class MockDirectory {
    path: string;
    name: string;

    constructor(parent: any, name: string) {
      if (name === 'photos') {
        this.name = 'photos';
        this.path = 'photos';
      } else {
        this.name = name;
        this.path = name;
      }
    }

    get exists() {
      if (this.name === 'photos') return true;
      return !!mockFileSystemState[this.name];
    }

    create() {
      if (this.name === 'photos') return;
      mockFileSystemState[this.name] = [];
    }

    list() {
      if (this.name === 'photos') {
        return Object.keys(mockFileSystemState).map((folderName) => new MockDirectory(null, folderName));
      }
      const files = mockFileSystemState[this.name] || [];
      return files.map((f) => new MockFile(f.uri, f.name));
    }

    move(dest: MockDirectory) {
      const oldName = this.name;
      const newName = dest.name;
      mockFileSystemState[newName] = mockFileSystemState[oldName];
      delete mockFileSystemState[oldName];
      return Promise.resolve();
    }

    delete() {
      delete mockFileSystemState[this.name];
      return Promise.resolve();
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: 'file://docs' },
  };
});

/* =====================================================
   TEST SUITE
===================================================== */
describe('GalleryScreen', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    jest.clearAllMocks();
    for (const prop of Object.getOwnPropertyNames(mockFileSystemState)) {
      delete mockFileSystemState[prop];
    }
    mockFileSystemState['Math'] = [
      { uri: 'file://Math/img1.jpg', name: 'img1.jpg' },
      { uri: 'file://Math/img1.json', name: 'img1.json' },
    ];
    mockFileSystemState['History'] = [
      { uri: 'file://History/img2.jpg', name: 'img2.jpg' },
      { uri: 'file://History/img2.json', name: 'img2.json' },
    ];
  });

  it('renders folders correctly on load', async () => {
    const { getByText } = render(<GalleryScreen />);
    await waitFor(() => {
      expect(getByText('Math')).toBeTruthy();
      expect(getByText('History')).toBeTruthy();
    });
  });

  it('renders empty state when no folders exist', async () => {
    for (const prop of Object.getOwnPropertyNames(mockFileSystemState)) {
      delete mockFileSystemState[prop];
    }
    const { getByText } = render(<GalleryScreen />);
    await waitFor(() => {
      expect(getByText('No folders yet. Take a photo to start!')).toBeTruthy();
    });
  });

  it('filters folders and photos when searching', async () => {
    const { getByTestId, getByText, queryByText } = render(<GalleryScreen />);
    await waitFor(() => getByText('Math'));

    const searchBar = getByTestId('search-bar');
    fireEvent.changeText(searchBar, 'Math');

    expect(getByText('Math')).toBeTruthy();
    expect(queryByText('History')).toBeNull();
  });

  it('renames a folder successfully', async () => {
    const { getByText, getByTestId, getByPlaceholderText, queryByText } = render(<GalleryScreen />);
    await waitFor(() => getByText('Math'));

    fireEvent.press(getByTestId('edit-Math'));
    const input = getByPlaceholderText('Enter new folder name');
    fireEvent.changeText(input, 'Mathematics');

    await act(async () => {
      fireEvent.press(getByText('Rename'));
    });

    await waitFor(() => {
      expect(queryByText('Math')).toBeNull();
      expect(getByText('Mathematics')).toBeTruthy();
    });
  });

  it('shows error when renaming to an existing folder name', async () => {
    const { getByText, getByTestId, getByPlaceholderText } = render(<GalleryScreen />);
    await waitFor(() => getByText('Math'));

    fireEvent.press(getByTestId('edit-Math'));
    const input = getByPlaceholderText('Enter new folder name');
    // Đặt tên trùng với folder đã tồn tại: "History"
    fireEvent.changeText(input, 'History');

    await act(async () => {
      fireEvent.press(getByText('Rename'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Folder name already exists.');
    });
  });

  it('handles delete action gracefully when folder no longer exists', async () => {
    const { getByText, getByTestId, getAllByText } = render(<GalleryScreen />);

    await waitFor(() => getByText('History'));

    // Xóa khỏi mock để giả lập folder không còn tồn tại
    delete mockFileSystemState['History'];

    fireEvent.press(getByTestId('delete-History'));

    // Nút Delete trong modal - chữ "Delete" xuất hiện cả trên card và trong modal,
    // nên lấy phần tử cuối cùng (nằm trong modal)
    const confirmDelete = await waitFor(() => {
      const deleteButtons = getAllByText('Delete');
      return deleteButtons[deleteButtons.length - 1];
    });

    await act(async () => {
      fireEvent.press(confirmDelete);
    });

    // Không crash, không throw – chỉ cần test chạy hết là được
    await waitFor(() => {
      expect(true).toBe(true);
    });
  });

  it('filters photos by note when searching', async () => {
    const { getByTestId, getByText } = render(<GalleryScreen />);
    await waitFor(() => getByText('Math'));

    const searchBar = getByTestId('search-bar');
    // Nội dung note trong mock getPhotosFromCache là "Test Note"
    fireEvent.changeText(searchBar, 'Test Note');

    // Kết quả Photos matches hiển thị số lượng ảnh
    await waitFor(() => {
      expect(getByText(/Photos matches/)).toBeTruthy();
    });
  });
});
