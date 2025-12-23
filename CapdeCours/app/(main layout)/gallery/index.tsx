import FolderCard from '@/components/Folder';
import { SearchBar } from '@/components/SearchBar';
import { Directory, Paths } from 'expo-file-system';
import { RelativePathString, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View, Text } from 'react-native';

export default function GalleryScreen() {
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFolders = async () => {
    try {
      const photosDir = new Directory(Paths.document, 'photos');

      // 1. Safety Check: Tạo folder gốc nếu chưa có
      if (!photosDir.exists) {
        photosDir.create();
        setFolders([]);
        return;
      }

      // 2. Lấy danh sách nội dung
      const contents = photosDir.list(); // Returns (File | Directory)[]

      // 3. Lọc lấy các Folder Môn học & Sắp xếp
      const folderList: string[] = contents
        .filter((item) => item instanceof Directory) // Chỉ lấy thư mục (Môn học)
        .map((item) => item.name) // Lấy tên folder
        .sort((a, b) => a.localeCompare(b)); // Sắp xếp A-Z

      setFolders(folderList);
    } catch (e) {
      console.error('Error loading gallery:', e);
    } finally {
      setLoading(false);
    }
  };

  // 4. Reload mỗi khi quay lại màn hình này
  useFocusEffect(
    useCallback(() => {
      loadFolders();
    }, [])
  );

  return (
    <View className="flex-1">
      <SearchBar />
      {loading ? (
        <View className="mt-10">
          <ActivityIndicator size="large" color="#AC3C00" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Empty State */}
          {folders.length === 0 && (
            <Text className="text-center text-gray-400 mt-10 font-sen">
              No folders yet. Take a photo to start!
            </Text>
          )}

          {/* Render List: Hiển thị tên Môn học */}
          {folders.map((folder) => (
            <FolderCard 
              key={folder} 
              title={folder} // Tên folder là tên môn học
              // Link chuyển hướng sang màn hình Session, truyền tên folder theo
              link={`/sessionFolders/${folder}` as RelativePathString} 
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}