import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import DetailView from '../app/(custom layout)/imageDetails/index';
import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';

/* ========================================================================== */
/* 1. MOCKS GLOBAL                                                            */
/* ========================================================================== */

// --- MOCK EXPO ROUTER ---
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ uri: 'file://photos/test.jpg' }),
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
  }),
  router: {
    back: mockBack,
  }
}));

// --- MOCK COMPONENTS CON ---
jest.mock('@/components/BottomNav', () => 'BottomNav');
// [FIX] Mock FolderCard render ra Text để getByText tìm thấy
jest.mock('@/components/Folder', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return (props: any) => (
    <TouchableOpacity onPress={props.onPress} testID="mock-folder-card">
      <Text>{props.title}</Text>
    </TouchableOpacity>
  );
});

// --- MOCK UTILS CACHE ---
jest.mock('@/utils/photoCache', () => ({
  clearFolderCache: jest.fn(),
  updateCacheAfterMove: jest.fn(),
  getPhotosFromCache: jest.fn().mockResolvedValue([]),
  savePhotosToCache: jest.fn(),
}));

// --- MOCK UI LIBRARIES ---
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        snapToIndex: jest.fn(),
        close: jest.fn(),
      }));
      return <View testID="mock-bottom-sheet">{props.children}</View>;
    }),
    BottomSheetScrollView: (props: any) => <View {...props} />,
  };
});

jest.mock('react-native-pager-view', () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.forwardRef((props: any, ref: any) => (
        <View testID="mock-pager-view">{props.children}</View>
    ));
});

jest.mock('react-native-gesture-handler', () => {
    const { View } = require('react-native');
    return {
        GestureHandlerRootView: View,
        PinchGestureHandler: View,
        PanGestureHandler: View,
        State: {},
    };
});

// --- MOCK EXPO FILE SYSTEM (CLASS BASED) ---
const mockFileExists = jest.fn().mockReturnValue(true);
const mockFileText = jest.fn();
const mockFileWrite = jest.fn();
const mockFileMove = jest.fn();
const mockFileDelete = jest.fn();
const mockDirList = jest.fn().mockReturnValue([]);
const mockDirCreate = jest.fn();

jest.mock('expo-file-system', () => {
  class MockFile {
    name: string;
    uri: string;
    exists = true; 
    constructor(uriOrParent: any, name?: string) {
      if (name) {
          const parentUri = uriOrParent.uri || uriOrParent;
          this.name = name;
          this.uri = `${parentUri}/${name}`;
      } else {
          this.uri = uriOrParent;
          this.name = uriOrParent.split('/').pop();
      }
      this.exists = mockFileExists();
    }
    text = mockFileText;
    write = mockFileWrite;
    move = mockFileMove;
    delete = mockFileDelete;
  }

  class MockDirectory {
    uri: string;
    exists = true;
    name: string;
    constructor(uriOrParent: any, name?: string) {
        if (name) {
            const parentUri = uriOrParent.uri || uriOrParent;
            this.name = name;
            this.uri = `${parentUri}/${name}`;
        } else {
            this.uri = uriOrParent;
            this.name = 'root';
        }
    }
    list = mockDirList;
    create = mockDirCreate;
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: 'file://docs' },
  };
});

// --- MOCK MEDIA LIBRARY ---
jest.mock('expo-media-library', () => ({
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    saveToLibraryAsync: jest.fn(),
}));

// --- [FIX] MOCK ICONS: Trả về <Text> để getByText tìm thấy dễ dàng ---
jest.mock('lucide-react-native', () => {
  const { Text } = require('react-native');
  return {
    Trash2: () => <Text>TrashIcon</Text>,
    Edit: () => <Text>EditIcon</Text>,
    Check: () => <Text>CheckIcon</Text>,
    Plus: () => <Text>PlusIcon</Text>,
    ChevronLeft: () => <Text>ChevronLeftIcon</Text>,
    X: () => <Text>XIcon</Text>,
    Folder: () => <Text>FolderIcon</Text>,
    RotateCw: () => <Text>RotateIcon</Text>,
    Download: () => <Text>DownloadIcon</Text>,
  };
});


/* ========================================================================== */
/* 2. TEST SUITE                                                              */
/* ========================================================================== */

describe('DetailView Screen', () => {
  const sampleMetadata = {
    name: 'Test Photo',
    folder: 'Vacation',
    time: '2024-01-01T12:00:00.000Z',
    note: 'Awesome trip',
    session: 'Day 1',
    rotation: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileExists.mockReturnValue(true);
    mockFileText.mockResolvedValue(JSON.stringify(sampleMetadata));
    mockDirList.mockReturnValue([]);
  });

  /* ------------------------------------------------------------------------ */
  /* TEST RENDERING & LOADING                                                 */
  /* ------------------------------------------------------------------------ */

  it('renders correctly and loads metadata', async () => {
    const { getByText } = render(<DetailView />);

    await waitFor(() => {
        expect(getByText('Test Photo')).toBeTruthy();
        expect(getByText('Awesome trip')).toBeTruthy();
        expect(getByText('Vacation / Day 1')).toBeTruthy();
    });
  });

  /* ------------------------------------------------------------------------ */
  /* TEST EDITING METADATA                                                    */
  /* ------------------------------------------------------------------------ */

  it('allows editing Name and saves to JSON', async () => {
    const { getAllByText, getByDisplayValue, getByText } = render(<DetailView />);
    
    // Chờ UI load xong
    await waitFor(() => expect(getByText('Test Photo')).toBeTruthy());

    const editIcons = getAllByText('EditIcon');
    fireEvent.press(editIcons[0]); // Name

    const nameInput = getByDisplayValue('Test Photo');
    fireEvent.changeText(nameInput, 'New Name 2024');

    const checkIcons = getAllByText('CheckIcon');
    await act(async () => {
        fireEvent.press(checkIcons[0]);
    });

    expect(mockFileWrite).toHaveBeenCalledWith(expect.stringContaining('"name": "New Name 2024"'));
  });

  it('allows editing Note and saves to cache', async () => {
    const { getByText, getByTestId } = render(<DetailView />);
    await waitFor(() => expect(getByText('Awesome trip')).toBeTruthy());

    const noteEditBtn = getByTestId('note-edit-toggle');
    fireEvent.press(noteEditBtn);

    const noteInput = getByTestId('note-input');
    fireEvent.changeText(noteInput, 'Updated Note content');

    await act(async () => {
        fireEvent.press(noteEditBtn); // Save
    });

    expect(mockFileWrite).toHaveBeenCalledWith(expect.stringContaining('"note": "Updated Note content"'));
  });

  /* ------------------------------------------------------------------------ */
  /* TEST ROTATION                                                            */
  /* ------------------------------------------------------------------------ */

  it('rotates image and updates metadata', async () => {
    const { getByText } = render(<DetailView />);
    await waitFor(() => expect(getByText('Test Photo')).toBeTruthy());

    const rotateBtn = getByText('RotateIcon');
    await act(async () => {
        fireEvent.press(rotateBtn);
    });

    expect(mockFileWrite).toHaveBeenCalledWith(expect.stringContaining('"rotation": 90'));
  });

  /* ------------------------------------------------------------------------ */
  /* TEST DELETE                                                              */
  /* ------------------------------------------------------------------------ */

  it('deletes image file and metadata file on confirmation', async () => {
    const { getByTestId, getByText } = render(<DetailView />);
    await waitFor(() => expect(getByText('Test Photo')).toBeTruthy());

    const spyAlert = jest.spyOn(Alert, 'alert');
    const deleteBtn = getByTestId('header-delete-button');
    fireEvent.press(deleteBtn);

    expect(spyAlert).toHaveBeenCalled();

    const alertButtons = spyAlert.mock.calls[0][2];
    const confirmBtn = alertButtons?.find((btn: any) => btn.text === 'Xóa');
    
    await act(async () => {
        if (confirmBtn?.onPress) {
            await confirmBtn.onPress();
        }
    });

    expect(mockFileDelete).toHaveBeenCalledTimes(2);
    expect(mockBack).toHaveBeenCalled();
  });

  /* ------------------------------------------------------------------------ */
  /* TEST SAVE TO GALLERY                                                     */
  /* ------------------------------------------------------------------------ */

  it('saves to gallery when permission granted', async () => {
    const { getByText } = render(<DetailView />);
    
    // [FIX]: Chờ UI load xong "Test Photo" thì mới tìm DownloadIcon
    // Nếu dùng waitFor(() => {}) rỗng, nó có thể chạy trước khi loading=false
    await waitFor(() => expect(getByText('Test Photo')).toBeTruthy());

    const downloadBtn = getByText('DownloadIcon');
    
    await act(async () => {
        fireEvent.press(downloadBtn);
    });

    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file://photos/test.jpg');
  });

  /* ------------------------------------------------------------------------ */
  /* TEST MOVE FOLDER LOGIC                                                   */
  /* ------------------------------------------------------------------------ */

  it('navigates to folder selection and moves image', async () => {
    // Setup Mock Directory List
    const { Directory, File } = require('expo-file-system');
    mockDirList.mockReturnValue([
        new Directory('file://photos', 'Work'),
        new Directory('file://photos', 'Home')
    ]);

    const { getByText, getAllByText } = render(<DetailView />);
    await waitFor(() => expect(getByText('Vacation / Day 1')).toBeTruthy());

    // 1. Trigger Edit Folder (EditIcon thứ 2)
    const editIcons = getAllByText('EditIcon');
    await act(async () => {
        fireEvent.press(editIcons[1]); 
    });

    // 2. Chờ màn hình chọn folder hiện ra
    await waitFor(() => {
        expect(getByText('CHOOSE FOLDER')).toBeTruthy();
        expect(getByText('Work')).toBeTruthy();
    });

    // Setup Mock cho Session trong Work
    const workFile = new File('file://photos/Work/1.json');
    mockDirList.mockReturnValueOnce([workFile]);
    mockFileText.mockResolvedValueOnce(JSON.stringify({ session: 'Meeting' }));

    // 3. Chọn Folder "Work"
    await act(async () => {
        fireEvent.press(getByText('Work'));
    });

    // 4. Chờ màn hình chọn Session
    await waitFor(() => {
        expect(getByText('CHOOSE SESSION')).toBeTruthy();
        expect(getByText('Meeting')).toBeTruthy();
    });

    // 5. Chọn Session "Meeting"
    await act(async () => {
        fireEvent.press(getByText('Meeting'));
    });

    // 6. Verify Move
    expect(mockFileMove).toHaveBeenCalled();
    expect(mockFileWrite).toHaveBeenCalledWith(expect.stringContaining('"folder": "Work"'));
    expect(mockFileWrite).toHaveBeenCalledWith(expect.stringContaining('"session": "Meeting"'));
  });
});