import { storeData, getData, removeData } from '../utils/asyncStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock thư viện AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('AsyncStorage Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Xóa sạch lịch sử gọi hàm trước mỗi test
  });

  // --- Test storeData ---
  describe('storeData', () => {
    it('should call AsyncStorage.setItem with correct arguments', async () => {
      await storeData('key1', 'value1');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('key1', 'value1');
    });

    it('should catch error and log it when setItem fails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const error = new Error('Storage failed');
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(error);

      await storeData('key1', 'value1');

      expect(consoleSpy).toHaveBeenCalledWith('Error storing val ', error);
      consoleSpy.mockRestore();
    });
  });

  // --- Test getData ---
  describe('getData', () => {
    it('should return value when AsyncStorage.getItem succeeds', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('mockValue');
      const result = await getData('key1');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('key1');
      expect(result).toBe('mockValue');
    });

    it('should catch error and log it when getItem fails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const error = new Error('Read failed');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(error);

      const result = await getData('key1');

      expect(consoleSpy).toHaveBeenCalledWith('Error getting val ', error);
      expect(result).toBeUndefined();
      consoleSpy.mockRestore();
    });
  });

  // --- Test removeData ---
  describe('removeData', () => {
    it('should call AsyncStorage.removeItem and log "Done."', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      await removeData('key1');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('key1');
      expect(consoleSpy).toHaveBeenCalledWith('Done.');
      consoleSpy.mockRestore();
    });

    it('should catch error and log it when removeItem fails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const error = new Error('Remove failed');
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(error);

      await removeData('key1');

      expect(consoleSpy).toHaveBeenCalledWith('Error removing val ', error);
      consoleSpy.mockRestore();
    });
  });
});
