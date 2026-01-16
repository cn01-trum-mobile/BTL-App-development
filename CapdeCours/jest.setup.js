import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});



// Mock console.error to reduce test noise
global.console = {
  ...console,
  error: jest.fn(),
};

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
  useLocalSearchParams: jest.fn(() => ({})),
  Stack: {
    Screen: ({ children }: { children: React.ReactNode }) => children,
  },
}));

// Mock expo-calendar
jest.mock('expo-calendar', () => ({
  getCalendarsAsync: jest.fn(() => Promise.resolve([])),
  requestCalendarPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    Constants: {
      FlashMode: {
        off: 'off',
        on: 'on',
        auto: 'auto',
      },
      WhiteBalance: {
        auto: 'auto',
        sunny: 'sunny',
        cloudy: 'cloudy',
        shadow: 'shadow',
        fluorescent: 'fluorescent',
        incandescent: 'incandescent',
      },
      FocusMode: {
        auto: 'auto',
        on: 'on',
      },
      CameraType: {
        back: 'back',
        front: 'front',
      },
    },
  },
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [{ status: 'granted' }, jest.fn()]),
}));

// Mock Lucide React Native icons
jest.mock('lucide-react-native', () => ({
  Info: 'Info',
  CalendarPlus: 'CalendarPlus',
  Camera: 'Camera',
  X: 'X',
  ChevronLeft: 'ChevronLeft',
  Check: 'Check',
  Plus: 'Plus',
  User: 'User',
  Mail: 'Mail',
  Lock: 'Lock',
  Eye: 'Eye',
  EyeOff: 'EyeOff',
  Calendar: 'Calendar',
  Clock: 'Clock',
  MapPin: 'MapPin',
  Image: 'Image',
  Home: 'Home',
  Settings: 'Settings',
  LogOut: 'LogOut',
  Edit: 'Edit',
  Trash: 'Trash',
  Save: 'Save',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ChevronRight: 'ChevronRight',
  ChevronDown: 'ChevronDown',
  Search: 'Search',
  Filter: 'Filter',
  Bell: 'Bell',
  Star: 'Star',
  Heart: 'Heart',
  Share: 'Share',
  Download: 'Download',
  Upload: 'Upload',
  RefreshCw: 'RefreshCw',
  MoreVertical: 'MoreVertical',
  Menu: 'Menu',
  Close: 'Close',
  AlertCircle: 'AlertCircle',
  CheckCircle: 'CheckCircle',
  XCircle: 'XCircle',
  InfoIcon: 'InfoIcon',
  AlertTriangle: 'AlertTriangle',
  HelpCircle: 'HelpCircle',
  Key: 'Key',
  BookOpen: 'BookOpen',
  BookText: 'BookText',
}));