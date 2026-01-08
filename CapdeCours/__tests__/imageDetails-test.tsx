import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import DetailView from '../app/(custom layout)/imageDetails/index';
import { Alert, TouchableOpacity } from 'react-native';

// --- Mocks ---

// 1. Router & params
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ uri: encodeURIComponent('file://photos/Math/img1.jpg') }),
}));

// 2. BottomNav
jest.mock('@/components/BottomNav', () => () => null);

// 3. FolderCard
jest.mock('@/components/Folder', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return ({ title, onPress }: any) => (
    <TouchableOpacity onPress={onPress} testID={`folder-card-${title}`}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

// 4. PagerView
jest.mock('react-native-pager-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockPager = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      setPage: jest.fn(),
    }));
    return <View {...props}>{props.children}</View>;
  });
  MockPager.displayName = 'PagerView';
  return MockPager;
});

// 5. Gesture handler root view
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
  };
});

// 6. BottomSheet (mock @gorhom/bottom-sheet để tránh lỗi UNDETERMINED)
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  const BottomSheet = React.forwardRef((props: any, ref: any) => (
    <View {...props}>{props.children}</View>
  ));
  BottomSheet.displayName = 'BottomSheet';

  const BottomSheetScrollView = (props: any) => (
    <View {...props}>{props.children}</View>
  );

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheet,
    BottomSheetScrollView,
  };
});

// 7. FileSystem & photoCache
const mockFilesByFolder: Record<string, any[]> = {
  Math: [
    { name: 'img1.jpg', uri: 'file://photos/Math/img1.jpg' },
    { name: 'img1.json', uri: 'file://photos/Math/img1.json' },
  ],
};

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    name: string;
    exists = true;
    private content: string;

    constructor(uriOrDir: any, name?: string) {
      if (typeof uriOrDir === 'string') {
        this.uri = uriOrDir;
      } else {
        // parent directory + file name
        this.uri = `file://photos/${uriOrDir.name}/${name}`;
      }
      this.name = name || this.uri.split('/').pop() || '';
      this.content = JSON.stringify({
        name: 'Sample',
        folder: 'Math',
        time: '2024-01-01T08:00:00.000Z',
        note: 'Note',
        session: '2024-01-01',
        subject: 'Math',
      });
    }

    async text() {
      return this.content;
    }

    async write(newContent: string) {
      this.content = newContent;
    }

    async move(_dest: any) {
      return;
    }

    async delete() {
      this.exists = false;
    }
  }

  class MockDirectory {
    name: string;
    exists = true;

    constructor(parent: any, name: string) {
      this.name = name;
      if (!mockFilesByFolder[name]) this.exists = false;
    }

    list() {
      const children = mockFilesByFolder[this.name] || [];
      return children.map((f) => new MockFile(f.uri));
    }

    create() {
      mockFilesByFolder[this.name] = mockFilesByFolder[this.name] || [];
      this.exists = true;
    }
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: 'file://photos' },
  };
});

const mockClearFolderCache = jest.fn();
const mockUpdateCacheAfterMove = jest.fn();
const mockGetPhotosFromCache = jest.fn();
const mockSavePhotosToCache = jest.fn();

jest.mock('@/utils/photoCache', () => ({
  clearFolderCache: (...args: any[]) => mockClearFolderCache(...args),
  updateCacheAfterMove: (...args: any[]) => mockUpdateCacheAfterMove(...args),
  getPhotosFromCache: (...args: any[]) => mockGetPhotosFromCache(...args),
  savePhotosToCache: (...args: any[]) => mockSavePhotosToCache(...args),
}));

describe('DetailView (imageDetails)', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    jest.clearAllMocks();
    // cache miss mặc định
    mockGetPhotosFromCache.mockResolvedValue(null);
  });

  it('loads metadata and renders basic UI', async () => {
    const { getAllByText, getByText } = render(<DetailView />);

    await waitFor(() => {
      // Label + value được render trong BottomSheet
      expect(getByText('Name')).toBeTruthy();
      expect(getByText('Sample')).toBeTruthy();
      expect(getByText('Folder')).toBeTruthy();
      expect(getByText('Time')).toBeTruthy();
      // "Note" xuất hiện ở cả label và value nên dùng getAllByText
      expect(getAllByText('Note').length).toBeGreaterThan(0);
    });
  });

  it('deletes image and navigates back when last image', async () => {
    mockFilesByFolder.Math = [
      { name: 'img1.jpg', uri: 'file://photos/Math/img1.jpg' },
      { name: 'img1.json', uri: 'file://photos/Math/img1.json' },
    ];

    let buttons: any[] = [];
    alertSpy.mockImplementation((
      _title: string,
      _msg?: string,
      bts?: any[],
      _options?: any
    ) => {
      if (bts) buttons = bts;
    });

    const { getByTestId } = render(<DetailView />);

    // Chờ header load xong rồi mới bấm nút delete trên header để hiện Alert
    const headerDeleteBtn = await waitFor(() =>
      getByTestId('header-delete-button')
    );

    await act(async () => {
      fireEvent.press(headerDeleteBtn);
    });

    // Chờ cho Alert được tạo và buttons được capture
    await waitFor(() => {
      expect(buttons.length).toBeGreaterThan(0);
    });

    const deleteBtn = buttons.find((b) => b.text === 'Xóa');

    await act(async () => {
      if (deleteBtn && typeof deleteBtn.onPress === 'function') {
        await deleteBtn.onPress();
      }
    });

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });
  });
});


