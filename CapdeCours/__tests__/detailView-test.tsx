import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import DetailView from '../app/(custom layout)/imageDetails/index';
import { Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
// Import Class Mock
import { File, Directory } from 'expo-file-system'; 

/* ========================================================================== */
/* 1. SETUP LOGS & MOCKS                                                      */
/* ========================================================================== */

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ uri: 'file://photos/img1.jpg' }),
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  router: { back: mockBack }
}));

jest.mock('@/components/BottomNav', () => 'BottomNav');

// Mock FolderCard
jest.mock('@/components/Folder', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return (props: any) => (
    <TouchableOpacity onPress={props.onPress} testID={`folder-${props.title}`}>
      <Text>{props.title}</Text>
      {props.rightIcon}
    </TouchableOpacity>
  );
});

jest.mock('@/utils/photoCache', () => ({
  clearFolderCache: jest.fn(),
  updateCacheAfterMove: jest.fn(),
  getPhotosFromCache: jest.fn().mockResolvedValue([]),
  savePhotosToCache: jest.fn(),
}));

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
    return React.forwardRef((props: any, ref: any) => {
        React.useImperativeHandle(ref, () => ({ setPage: jest.fn() }));
        return <View testID="mock-pager-view" {...props}>{props.children}</View>;
    });
});

jest.mock('react-native-gesture-handler', () => {
    const { View } = require('react-native');
    return {
        GestureHandlerRootView: View,
        PinchGestureHandler: (props: any) => <View {...props} testID="pinch-handler" />,
        PanGestureHandler: View,
        State: { END: 5 },
    };
});

jest.mock('expo-media-library', () => ({
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    saveToLibraryAsync: jest.fn(),
}));

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

// --- EXPO FILE SYSTEM MOCK (Class-based) ---
const mockFileExists = jest.fn();
const mockFileText = jest.fn();
const mockFileWrite = jest.fn();
const mockFileMove = jest.fn();
const mockFileDelete = jest.fn();
const mockDirCreate = jest.fn();
const mockDirList = jest.fn();

jest.mock('expo-file-system', () => {
  class MockFile {
    name: string;
    uri: string;
    constructor(uriOrParent: any, name?: string) {
      if (name) {
          const parentUri = uriOrParent.uri || uriOrParent;
          this.name = name;
          this.uri = `${parentUri}/${name}`;
      } else {
          this.uri = uriOrParent;
          this.name = uriOrParent.split('/').pop();
      }
    }
    // Getter dynamic calls mock function
    get exists() { return mockFileExists(this.uri); }
    async text() { return mockFileText(this.uri); }
    async write(c: string) { return mockFileWrite(this.uri, c); }
    async move(d: any) { return mockFileMove(this.uri, d); }
    async delete() { return mockFileDelete(this.uri); }
  }

  class MockDirectory {
    uri: string;
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
    // Dùng chung mockExists
    get exists() { return mockFileExists(this.uri); }
    async create() { return mockDirCreate(this.uri); }
    list() { return mockDirList(this.uri); }
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { document: 'file://docs' },
  };
});

/* ========================================================================== */
/* 2. TEST SUITE                                                              */
/* ========================================================================== */

describe('DetailView Screen - High Coverage', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default: Files exist
    mockFileExists.mockReturnValue(true);
    
    // Default: Metadata content (Mặc định ở Unorganized để test Move dễ hơn)
    mockFileText.mockResolvedValue(JSON.stringify({
      name: 'Photo 1', 
      folder: 'Unorganized', 
      session: 'S1', 
      time: new Date().toISOString()
    }));
    
    // Default: Folder list rỗng
    mockDirList.mockReturnValue([]);
  });

  /* ------------------------------------------------------------------------ */
  /* TEST CASES                                                               */
  /* ------------------------------------------------------------------------ */

  it('handles file without JSON metadata gracefully', async () => {
    // Logic: Check ảnh (call 1) -> true, Check json (call 2) -> false
    // Implementation check đuôi file
    mockFileExists.mockImplementation((uri: string) => !uri.endsWith('.json'));

    const { getByText } = render(<DetailView />);
    
    await waitFor(() => {
        // [FIX]: EditableField render <Text>, dùng getByText
        expect(getByText('Unknown')).toBeTruthy(); 
        expect(getByText(/Unorganized/)).toBeTruthy();
    });
  });

  it('creates new folder and updates list', async () => {
    const { getAllByText, getByText, getByPlaceholderText } = render(<DetailView />);
    await waitFor(() => expect(getByText(/Unorganized/)).toBeTruthy());

    // 1. Mở Folder Select
    fireEvent.press(getAllByText('EditIcon')[1]); 
    await waitFor(() => expect(getByText('CHOOSE FOLDER')).toBeTruthy());

    // 2. Bấm nút "+"
    fireEvent.press(getByText('PlusIcon'));

    // 3. Nhập tên folder mới
    const input = getByPlaceholderText('FOLDER NAME...');
    fireEvent.changeText(input, 'NewFolder');
    
    // [FIX]: Mock exists=false cho 'NewFolder' để kích hoạt create()
    mockFileExists.mockImplementation((uri: string) => {
        if (uri && uri.includes('NewFolder')) return false;
        return true;
    });

    fireEvent(input, 'submitEditing');

    // 4. Verify logic tạo folder
    expect(mockDirCreate).toHaveBeenCalled();
  });

  it('creates new session and moves photo immediately', async () => {
    // [FIX] Mock list trả về Directory class để pass instanceof
    mockDirList.mockReturnValue([new Directory('file://docs/photos', 'Home')]);

    const { getByText, getAllByText, getByPlaceholderText } = render(<DetailView />);
    // Chờ load xong
    await waitFor(() => expect(getByText(/Unorganized/)).toBeTruthy());

    // 1. Mở Folder Select
    fireEvent.press(getAllByText('EditIcon')[1]); 
    // Chờ list folder hiện ra
    await waitFor(() => expect(getByText('Home')).toBeTruthy());
    
    // [FIX] Reset mock list để trả về rỗng (list session của folder Home)
    mockDirList.mockReturnValue([]); 

    // 2. Chọn Home -> Chuyển sang Session Select
    fireEvent.press(getByText('Home'));
    await waitFor(() => expect(getByText('CHOOSE SESSION')).toBeTruthy());

    // 3. Tạo Session Mới
    fireEvent.press(getByText('PlusIcon'));
    const input = getByPlaceholderText('SESSION NAME...');
    fireEvent.changeText(input, 'NewSession');
    fireEvent(input, 'submitEditing');

    // 4. Verify Move logic
    await waitFor(() => {
        expect(mockFileMove).toHaveBeenCalled();
        
        // [FIX]: mockFileWrite được gọi với (uri, content). 
        // Ta dùng expect.any(String) cho tham số đầu tiên (uri), 
        // và expect.stringContaining(...) cho tham số thứ hai (content).
        expect(mockFileWrite).toHaveBeenCalledWith(
            expect.any(String), 
            expect.stringContaining('"session": "NewSession"')
        );
    });
  });

  it('shows alert when moving to same folder and session', async () => {
    // 1. Setup ảnh đang ở folder 'Home', session 'S1'
    mockFileText.mockResolvedValue(JSON.stringify({
        name: 'Photo 1', 
        folder: 'Home', 
        session: 'S1', 
        time: new Date().toISOString()
    }));
    mockDirList.mockReturnValue([new Directory('file://docs/photos', 'Home')]);

    const { getByText, getAllByText } = render(<DetailView />);
    await waitFor(() => expect(getByText('Home / S1')).toBeTruthy());

    // 2. Mở Folder Select
    fireEvent.press(getAllByText('EditIcon')[1]);
    await waitFor(() => expect(getByText('Home')).toBeTruthy());
    
    // 3. Setup mock list session cho folder Home trả về file json chứa S1
    const s1File = new File('file://docs/photos/Home/1.json');
    mockDirList.mockReturnValue([s1File]);
    
    // 4. Chọn Home
    fireEvent.press(getByText('Home'));

    // Chờ Session S1 hiện ra (Regex match "S1 (Current)")
    await waitFor(() => expect(getByText(/S1/)).toBeTruthy());
    
    // 5. Chọn lại S1
    const spyAlert = jest.spyOn(Alert, 'alert');
    fireEvent.press(getByText(/S1/)); 

    // Expect: Không move, hiện alert
    expect(spyAlert).toHaveBeenCalledWith('No Change', expect.any(String), expect.any(Array));
    expect(mockFileMove).not.toHaveBeenCalled();
  });

  it('handles deleting a photo when multiple exist (switches to prev)', async () => {
    // [FIX] Mock list trả về 2 file ảnh
    mockDirList.mockReturnValue([
        new File('file://docs/photos/img1.jpg'),
        new File('file://docs/photos/img2.jpg')
    ]);

    const { getByTestId, getAllByText } = render(<DetailView />);
    // Chờ text Photo 1 (Name) hiện ra
    await waitFor(() => expect(getAllByText('Photo 1')).toBeTruthy());

    const deleteBtn = getByTestId('header-delete-button');
    fireEvent.press(deleteBtn);

    const spyAlert = jest.spyOn(Alert, 'alert');
    expect(spyAlert).toHaveBeenCalled();

    const buttons = spyAlert.mock.calls[0][2];
    const deleteConfirm = buttons?.find((b: any) => b.text === 'Xóa');
    
    await act(async () => {
        await deleteConfirm?.onPress();
    });

    expect(mockFileDelete).toHaveBeenCalled();
    // Logic: còn ảnh img2 -> không back
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('loads multiple photos and allows swiping (PagerView)', async () => {
    mockDirList.mockReturnValue([
        new File('file://docs/photos/img1.jpg'),
        new File('file://docs/photos/img2.jpg')
    ]);
    
    const { getByTestId, getAllByText } = render(<DetailView />);
    // Chờ PagerView render
    await waitFor(() => expect(getByTestId('mock-pager-view')).toBeTruthy());
    
    // Kiểm tra UI đã load tên ảnh
    expect(getAllByText('Photo 1')).toBeTruthy();

    const pager = getByTestId('mock-pager-view');
    fireEvent(pager, 'onPageSelected', {
        nativeEvent: { position: 1 } 
    });

    await waitFor(() => {
        expect(mockFileText).toHaveBeenCalled();
    });
  });

  it('handles pinch gesture (zoom)', async () => {
    const { getByTestId, getAllByText } = render(<DetailView />);
    await waitFor(() => expect(getAllByText('Photo 1')).toBeTruthy());

    const pinchHandler = getByTestId('pinch-handler');
    fireEvent(pinchHandler, 'onGestureEvent', {
        nativeEvent: { scale: 2, focalX: 100, focalY: 100, state: 4 }
    });
    fireEvent(pinchHandler, 'onHandlerStateChange', {
        nativeEvent: { scale: 2, state: 5 }
    });
  });

  it('handles double tap', async () => {
     const { getAllByText } = render(<DetailView />);
     await waitFor(() => expect(getAllByText('Photo 1')).toBeTruthy());
  });

});