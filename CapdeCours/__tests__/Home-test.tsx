import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index'; 

// --- CẤU HÌNH MOCKS CỐ ĐỊNH ---

// Dữ liệu giả lập cơ bản: ID lịch đã chọn
const MOCK_CALENDAR_IDS = ['1']; 

// 1. Mock AsyncStorage
const mockGetItem = jest.fn();
// Mặc định: Giả lập đã có ID lịch người dùng đã chọn
mockGetItem.mockResolvedValue(JSON.stringify(MOCK_CALENDAR_IDS)); 

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: mockGetItem,
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
}));

// 2. Mock Expo Calendar
const mockGetEventsAsync = jest.fn();
// Mặc định: Giả lập không có sự kiện nào
mockGetEventsAsync.mockResolvedValue([]); 

jest.mock('expo-calendar', () => ({
    getEventsAsync: mockGetEventsAsync,
    // Chỉ mock các hàm được sử dụng hoặc cần thiết
    requestCalendarPermissionsAsync: jest.fn(),
}));

// 3. Mock React Navigation (useFocusEffect)
// Giả lập effect chạy ngay lập tức khi component được render
jest.mock('@react-navigation/native', () => ({
    useFocusEffect: jest.fn((callback) => callback()),
    useNavigation: () => ({ navigate: jest.fn() }),
}));

// 4. Mock các thành phần UI/Date
jest.mock('lucide-react-native', () => ({
    CalendarPlus: 'CalendarPlus',
}));

// Sử dụng Date-fns thật nhưng cố định ngày hiện tại để dễ test logic
jest.mock('date-fns', () => {
    const actualDateFns = jest.requireActual('date-fns');
    
    // Đặt ngày cố định: Thứ Hai, 1/1/2024
    const MOCK_START_DATE = new Date(2024, 0, 1); 
    
    return {
        ...actualDateFns,
        // Cố định tuần bắt đầu để thanh chọn ngày không bị thay đổi
        startOfWeek: jest.fn(() => new Date(2023, 11, 31)), 
        // Đảm bảo isSameDay và format hoạt động đúng để test chọn ngày
        isSameDay: actualDateFns.isSameDay, 
        format: actualDateFns.format,
        addDays: actualDateFns.addDays,
        differenceInMinutes: actualDateFns.differenceInMinutes,
        startOfDay: actualDateFns.startOfDay,
        endOfDay: actualDateFns.endOfDay,
    };
});

// --- DỮ LIỆU MOCK SỰ KIỆN ---

const MOCK_EVENTS = [
    {
        title: 'Machine learning',
        startDate: new Date(2024, 0, 1, 8, 0).toISOString(),
        endDate: new Date(2024, 0, 1, 9, 30).toISOString(),
        location: 'Room 101',
    },
    {
        title: 'Deep learning',
        startDate: new Date(2024, 0, 1, 12, 0).toISOString(),
        endDate: new Date(2024, 0, 1, 14, 0).toISOString(),
        location: 'Online',
    },
];

// --- CÁC TEST CASE ĐƠN GIẢN HÓA ---

describe('Home Component Core Functionality', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset về trạng thái mặc định cho mỗi test
        mockGetItem.mockResolvedValue(JSON.stringify(MOCK_CALENDAR_IDS));
        mockGetEventsAsync.mockResolvedValue([]); 
    });

    it('1. Renders basic structure (Welcome and Banner)', () => {
        const { getByText, getByTestId } = render(<Home />);
        
        // Kiểm tra các phần tử hiển thị tĩnh
        expect(getByText('Welcome back!')).toBeTruthy();
        expect(getByText('Schedule (01/01)')).toBeTruthy();
        expect(getByText('Classify unorganized images now!')).toBeTruthy();
    });

    it('2. Shows loading state before fetching data', () => {
        // Giả lập cuộc gọi API đang chờ (chưa resolved)
        mockGetEventsAsync.mockImplementation(() => new Promise(() => {})); 

        const { getByTestId } = render(<Home />);
        
        // Kiểm tra ActivityIndicator có hiển thị (Yêu cầu phải có testID="loading-indicator")
        expect(getByTestId('loading-indicator')).toBeTruthy();
    });
    
    it('3. Renders empty state when no events are found', async () => {
        // Giả lập API trả về mảng rỗng
        mockGetEventsAsync.mockResolvedValue([]);
        
        const { getByText } = render(<Home />);

        // Chờ dữ liệu tải xong
        await waitFor(() => {
            expect(getByText('No classes scheduled for today.')).toBeTruthy();
        });
        
        // Đảm bảo Async Storage và Calendar API đã được gọi
        expect(mockGetItem).toHaveBeenCalled();
        expect(mockGetEventsAsync).toHaveBeenCalled();
    });

    it('4. Renders event list correctly when data is available', async () => {
        // Giả lập API trả về dữ liệu sự kiện
        mockGetEventsAsync.mockResolvedValue(MOCK_EVENTS);

        const { getByText, queryByText } = render(<Home />);

        await waitFor(() => {
            // Kiểm tra các sự kiện được hiển thị
            expect(getByText('Machine learning')).toBeTruthy();
            expect(getByText('Deep learning')).toBeTruthy();
            
            // Kiểm tra giờ bắt đầu
            expect(getByText('08:00')).toBeTruthy();
            expect(getByText('12:00')).toBeTruthy();
            
            // Kiểm tra trạng thái rỗng không hiển thị
            expect(queryByText('No classes scheduled for today.')).toBeNull();
        });
    });

    it('5. Allows selecting a different day to reload schedule', async () => {
        // Load lần 1 (Ngày 1) có dữ liệu
        mockGetEventsAsync.mockResolvedValue(MOCK_EVENTS);
        const { getByText, getByTestId } = render(<Home />);

        await waitFor(() => {
            // Đảm bảo dữ liệu ban đầu đã load
            expect(getByText('Machine learning')).toBeTruthy();
        });

        // Giả lập load lần 2 (Ngày 2) không có dữ liệu
        mockGetEventsAsync.mockResolvedValue([]);

        // Ngày 1/1 là '1', ngày 2/1 là '2' (Tìm nút ngày '2')
        const dayTwoButton = getByText('2').parent; 
        
        if (dayTwoButton) {
            fireEvent.press(dayTwoButton);
        } else {
             // Dùng throw để Jest bắt lỗi nếu không tìm thấy
            throw new Error("Cannot find day 2 button."); 
        }
        
        // Chờ dữ liệu tải lại cho ngày mới
        await waitFor(() => {
            // Kiểm tra sự kiện ban đầu biến mất
            expect(getByText('No classes scheduled for today.')).toBeTruthy();
        });
        
        // Đảm bảo hàm lấy sự kiện đã được gọi 2 lần (1 lần init + 1 lần đổi ngày)
        expect(mockGetEventsAsync).toHaveBeenCalledTimes(2);
    });
});