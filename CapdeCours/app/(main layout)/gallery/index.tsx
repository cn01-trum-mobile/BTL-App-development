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

      // 2. Lấy danh sách nội dung (File | Directory)
      const contents = photosDir.list(); 

      const validFolders: string[] = [];

      // 3. Duyệt qua từng item để kiểm tra và lọc
      for (const item of contents) {
        // Chỉ xử lý nếu là Directory (Folder môn học)
        if (item instanceof Directory) {
            
            // Lấy danh sách file bên trong folder môn học đó
            const filesInside = item.list();
            
            // Kiểm tra xem có file ảnh (.jpg) nào không
            const hasPhotos = filesInside.some(f => f.name.endsWith('.jpg'));

            if (!hasPhotos) {
                // TRƯỜNG HỢP RỖNG (hoặc chỉ có file .json rác): XÓA FOLDER
                console.log(`Deleting empty folder: ${item.name}`);
                try {
                    item.delete(); // Xóa folder
                } catch (delErr) {
                    console.error(`Failed to delete ${item.name}`, delErr);
                }
            } else {
                // CÓ ẢNH: Giữ lại để hiển thị
                validFolders.push(item.name);
            }
        }
      }

      // 4. Sắp xếp danh sách folder còn lại (A-Z)
      validFolders.sort((a, b) => a.localeCompare(b));

      setFolders(validFolders);
    } catch (e) {
      console.error('Error loading gallery:', e);
    } finally {
      setLoading(false);
    }
  };

  // 5. Reload mỗi khi quay lại màn hình này
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