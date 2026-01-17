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

  // --- ADDITIONAL EDGE CASE TESTS FOR INCREASED COVERAGE ---

  it('should handle empty key in storeData', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await storeData('', 'value');
    
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('', 'value');
    consoleSpy.mockRestore();
  });

  it('should handle empty key in getData', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await getData('');
    
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('');
    consoleSpy.mockRestore();
  });

  it('should handle empty key in removeData', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await removeData('');
    
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('');
    consoleSpy.mockRestore();
  });

  it('should handle undefined value in storeData', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await storeData('key', undefined as any);
    
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('key', undefined);
    consoleSpy.mockRestore();
  });

  it('should handle null value in storeData', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await storeData('key', null as any);
    
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('key', null);
    consoleSpy.mockRestore();
  });

  it('should handle special characters in key and value', async () => {
    await storeData('key-with-special@#$%^&*()chars', 'value-with-special@#$%^&*()chars');
    
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('key-with-special@#$%^&*()chars', 'value-with-special@#$%^&*()chars');
  });

  it('should handle very long strings', async () => {
    const longString = 'a'.repeat(10000);
    
    await storeData('long-key', longString);
    
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('long-key', longString);
  });

  it('should handle unicode characters', async () => {
    const unicodeValue = '🚀 Test with unicode: áéíóú 中文 العربية';
    
    await storeData('unicode-key', unicodeValue);
    
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('unicode-key', unicodeValue);
  });

  it('should handle JSON strings', async () => {
    const jsonObject = { name: 'test', value: 123, nested: { prop: true } };
    const jsonString = JSON.stringify(jsonObject);
    
    await storeData('json-key', jsonString);
    
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('json-key', jsonString);
  });

  it('should return undefined when getData fails', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const error = new Error('Read failed');
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(error);

    const result = await getData('key1');

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('Error getting val ', error);
    consoleSpy.mockRestore();
  });

  it('should handle AsyncStorage.getItem returning null', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const result = await getData('key1');

    expect(result).toBeNull();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('key1');
  });

  it('should handle AsyncStorage.setItem throwing non-Error object', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue('String error');

    await storeData('key1', 'value1');

    expect(consoleSpy).toHaveBeenCalledWith('Error storing val ', 'String error');
    consoleSpy.mockRestore();
  });

  it('should handle AsyncStorage.getItem throwing non-Error object', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue({ message: 'Object error' });

    const result = await getData('key1');

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith('Error getting val ', { message: 'Object error' });
    consoleSpy.mockRestore();
  });

  it('should handle AsyncStorage.removeItem throwing non-Error object', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(123);

    await removeData('key1');

    expect(consoleSpy).toHaveBeenCalledWith('Error removing val ', 123);
    consoleSpy.mockRestore();
  });

  it('should always log "Done." even when removeItem fails', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const error = new Error('Remove failed');
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(error);

    await removeData('key1');

    // Should log both the error and "Done."
    expect(consoleSpy).toHaveBeenCalledWith('Error removing val ', error);
    expect(consoleSpy).toHaveBeenCalledWith('Done.');
    consoleSpy.mockRestore();
  });

  it('should handle concurrent operations', async () => {
    const promises = [
      storeData('key1', 'value1'),
      storeData('key2', 'value2'),
      getData('key1'),
      removeData('key2')
    ];

    await Promise.all(promises);

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
  });
});
});
