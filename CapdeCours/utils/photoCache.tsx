import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PhotoItem {
  uri: string;
  name: string;
  timestamp: number;
  note?: string;      // Quan trọng cho search
  subject?: string;   // Quan trọng cho search
  session?: string;
}

// Hàm lấy key lưu trong AsyncStorage
const getCacheKey = (folderName: string) => `PHOTO_CACHE_${folderName}`;

// 1. Lấy dữ liệu từ Cache
export const getPhotosFromCache = async (folderName: string): Promise<PhotoItem[] | null> => {
  try {
    const json = await AsyncStorage.getItem(getCacheKey(folderName));
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error('Error reading cache:', e);
    return null;
  }
};

// 2. Lưu (ghi đè) toàn bộ danh sách vào Cache
export const savePhotosToCache = async (folderName: string, photos: PhotoItem[]) => {
  try {
    await AsyncStorage.setItem(getCacheKey(folderName), JSON.stringify(photos));
  } catch (e) {
    console.error('Error saving cache:', e);
  }
};

// 3. Thêm 1 ảnh mới vào Cache (Dùng khi chụp xong)
export const addPhotoToCache = async (folderName: string, newPhoto: PhotoItem) => {
  try {
    const currentPhotos = (await getPhotosFromCache(folderName)) || [];
    const updatedPhotos = [newPhoto, ...currentPhotos]; // Thêm vào đầu danh sách
    await savePhotosToCache(folderName, updatedPhotos);
  } catch (e) {
    console.error('Error adding photo to cache:', e);
  }
};

export const clearFolderCache = async (folderName: string) => {
    await AsyncStorage.removeItem(getCacheKey(folderName));
}

export const updateCacheAfterMove = async (
  oldFolder: string,
  newFolder: string,
  photoUri: string,
  newPhotoData: Partial<PhotoItem>
) => {
  try {
    // 1. Xóa khỏi folder cũ
    const oldPhotos = (await getPhotosFromCache(oldFolder)) || [];
    const updatedOldPhotos = oldPhotos.filter(photo => photo.uri !== photoUri);
    await savePhotosToCache(oldFolder, updatedOldPhotos);
    
    // 2. Thêm vào folder mới
    const newPhotos = (await getPhotosFromCache(newFolder)) || [];
    
    // Tìm photo cũ để cập nhật thông tin
    const oldPhoto = oldPhotos.find(p => p.uri === photoUri);
    if (oldPhoto) {
      const updatedPhoto = {
        ...oldPhoto,
        ...newPhotoData,
        timestamp: newPhotoData.timestamp || oldPhoto.timestamp
      };
      await addPhotoToCache(newFolder, updatedPhoto);
    }
  } catch (e) {
    console.error('Lỗi cập nhật cache sau khi di chuyển:', e);
  }
};