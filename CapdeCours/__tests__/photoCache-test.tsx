import { getPhotosFromCache, savePhotosToCache, addPhotoToCache, clearFolderCache, updateCacheAfterMove, PhotoItem } from '../utils/photoCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('PhotoCache Utils', () => {
  const mockFolder = 'TestFolder';
  const mockKey = `PHOTO_CACHE_${mockFolder}`;
  const mockPhoto: PhotoItem = {
    uri: 'uri-1',
    name: 'photo1',
    timestamp: 123456,
    note: 'test note',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Test getPhotosFromCache ---
  describe('getPhotosFromCache', () => {
    it('should return parsed JSON if data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([mockPhoto]));
      const result = await getPhotosFromCache(mockFolder);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(mockKey);
      expect(result).toEqual([mockPhoto]);
    });

    it('should return null if no data exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await getPhotosFromCache(mockFolder);
      expect(result).toBeNull();
    });

    it('should return null and log error if exception occurs', async () => {
      // MOCK console.error để ẩn dòng chữ đỏ trên màn hình
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Fail'));

      const result = await getPhotosFromCache(mockFolder);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled(); // Kiểm tra xem code có gọi console.error không

      consoleSpy.mockRestore(); // Trả lại console.error bình thường
    });
  });

  // --- Test savePhotosToCache ---
  describe('savePhotosToCache', () => {
    it('should stringify data and call setItem', async () => {
      await savePhotosToCache(mockFolder, [mockPhoto]);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(mockKey, JSON.stringify([mockPhoto]));
    });

    it('should catch error (Simulated Failure)', async () => {
      // MOCK console.error để ẩn dòng chữ đỏ "Error: Fail"
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Giả lập lỗi
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Fail'));

      await savePhotosToCache(mockFolder, [mockPhoto]);

      expect(consoleSpy).toHaveBeenCalled(); // Code phải log lỗi thì mới đúng
      consoleSpy.mockRestore();
    });
  });

  // --- Test addPhotoToCache ---
  describe('addPhotoToCache', () => {
    it('should append new photo to existing list', async () => {
      const existingPhoto = { ...mockPhoto, uri: 'uri-old' };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([existingPhoto]));

      await addPhotoToCache(mockFolder, mockPhoto);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(mockKey, JSON.stringify([mockPhoto, existingPhoto]));
    });

    it('should start new list if cache is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await addPhotoToCache(mockFolder, mockPhoto);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(mockKey, JSON.stringify([mockPhoto]));
    });
  });

  // --- Test clearFolderCache ---
  describe('clearFolderCache', () => {
    it('should remove item', async () => {
      await clearFolderCache(mockFolder);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(mockKey);
    });
  });

  // --- Test updateCacheAfterMove ---
  describe('updateCacheAfterMove', () => {
    const oldFolder = 'Old';
    const newFolder = 'New';
    const targetUri = 'uri-target';

    const photoToMove: PhotoItem = { uri: targetUri, name: 'Target', timestamp: 100 };
    const otherPhoto: PhotoItem = { uri: 'uri-other', name: 'Other', timestamp: 200 };

    it('should remove from old folder and add to new folder with updated data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === `PHOTO_CACHE_${oldFolder}`) {
          return Promise.resolve(JSON.stringify([photoToMove, otherPhoto]));
        }
        if (key === `PHOTO_CACHE_${newFolder}`) {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve(null);
      });

      const newData: Partial<PhotoItem> = { note: 'Updated Note' };

      await updateCacheAfterMove(oldFolder, newFolder, targetUri, newData);

      // Check Old Folder
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(`PHOTO_CACHE_${oldFolder}`, JSON.stringify([otherPhoto]));

      // Check New Folder
      const expectedNewPhoto = {
        ...photoToMove,
        ...newData,
        timestamp: newData.timestamp || photoToMove.timestamp,
      };

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(`PHOTO_CACHE_${newFolder}`, expect.stringContaining(JSON.stringify([expectedNewPhoto])));
    });

    it('should log error if something fails', async () => {
      // MOCK console.error để ẩn dòng chữ đỏ
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Crash'));

      await updateCacheAfterMove(oldFolder, newFolder, targetUri, {});

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
