import FolderCard from '@/components/Folder';
import { SearchBar } from '@/components/SearchBar';
import { Directory, Paths, File } from 'expo-file-system';
import { RelativePathString, router, useFocusEffect } from 'expo-router';
import { useCallback, useState, useRef } from 'react';
import { ActivityIndicator, ScrollView, View, Text, Image, TouchableOpacity, Alert, TextInput, Animated, Modal } from 'react-native';
import { getPhotosFromCache, PhotoItem,  savePhotosToCache, clearFolderCache } from '@/utils/photoCache';


interface GlobalPhotoItem extends PhotoItem {
  folderName: string;
}

export default function GalleryScreen() {
  const [folders, setFolders] = useState<string[]>([]);
  const [allPhotos, setAllPhotos] = useState<GlobalPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');


  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState('');

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string>('');

  const swipeAnimations = useRef<{[key: string]: Animated.Value}>({});

  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const checkFolderHasPhotos = async (folderName: string): Promise<boolean> => {
    try {
      const photosDir = new Directory(Paths.document, 'photos');
      const folderDir = new Directory(photosDir, folderName);
      
      if (!folderDir.exists) {
        return false;
      }
      
      const files = folderDir.list();
      const hasJpg = files.some(f => 
        f instanceof File && f.name.toLowerCase().endsWith('.jpg')
      );
      
      const hasJson = files.some(f => 
        f instanceof File && f.name.toLowerCase().endsWith('.json')
      );
      
      return hasJpg || hasJson;
    } catch (error) {
      console.error(`Error checking folder ${folderName}:`, error);
      return false;
    }
  };

  

  // Hàm rebuild cache cho folder
  const rebuildCacheForFolder = async (folderName: string): Promise<PhotoItem[]> => {
    try {
      const photosDir = new Directory(Paths.document, 'photos');
      const folderDir = new Directory(photosDir, folderName);
      
      if (!folderDir.exists) {
        return [];
      }
      
      const files = folderDir.list();
      const jsonFiles = files.filter((f): f is File => 
        f instanceof File && f.name.toLowerCase().endsWith('.json')
      );
      
      
      const photos: PhotoItem[] = [];
      
      await Promise.all(
        jsonFiles.map(async (jsonFile) => {
          try {
            const imageUri = jsonFile.uri.replace('.json', '.jpg');
            const imageFileName = jsonFile.name.replace('.json', '.jpg');
            const imageFile = new File(imageUri);
            
            if (imageFile.exists) {
              const content = await jsonFile.text();
              const metadata = JSON.parse(content);
              
              photos.push({
                uri: imageUri,
                name: imageFileName,
                timestamp: new Date(metadata.time || Date.now()).getTime(),
                note: metadata.note || '',
                subject: metadata.subject || folderName,
                session: metadata.session || 'unknown',
              });
              
            } else {
              console.log(`Image not found for: ${jsonFile.name} (URI: ${imageUri})`);
            }
          } catch (e) {
            console.error(`Error reading ${jsonFile.name}:`, e);
          }
        })
      );
      
      // Sắp xếp theo thời gian (mới nhất đầu tiên)
      photos.sort((a, b) => b.timestamp - a.timestamp);
      
      // Lưu vào cache
      if (photos.length > 0) {
        await savePhotosToCache(folderName, photos);
      }
      
      return photos;
    } catch (error) {
      console.error(`Error rebuilding cache for folder ${folderName}:`, error);
      return [];
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const photosDir = new Directory(Paths.document, 'photos');
      if (!photosDir.exists) {
        photosDir.create();
        setFolders([]);
        setAllPhotos([]);
        return;
      }

      const contents = photosDir.list();
      const folderNames = contents
        .filter(i => i instanceof Directory)
        .map(d => d.name);

      const validFolders: string[] = [];
      const allPhotos: GlobalPhotoItem[] = [];

      for (const folderName of folderNames) {
        const hasPhotos = await checkFolderHasPhotos(folderName);
        
        if (hasPhotos) {
          validFolders.push(folderName);
          
          const photos = await getPhotosFromCache(folderName);          

          if (!photos || photos.length === 0) {
            const rebuiltPhotos = await rebuildCacheForFolder(folderName);
            
            if (rebuiltPhotos && rebuiltPhotos.length > 0) {
              rebuiltPhotos.forEach(p => {
                allPhotos.push({ ...p, folderName });
              });
            }
          } else if (photos.length > 0) {
            photos.forEach(p => {
              allPhotos.push({ ...p, folderName });
            });
          }

          if (!swipeAnimations.current[folderName]) {
            swipeAnimations.current[folderName] = new Animated.Value(0);
          }
        } else {
          console.log(`Skipping folder "${folderName}" as it has no photos.`);
        }
      }

      // Sửa: Loại bỏ folder trùng lặp (nếu có)
      const uniqueFolders = Array.from(new Set(validFolders));
      
      uniqueFolders.sort((a, b) => a.localeCompare(b));
      allPhotos.sort((a, b) => b.timestamp - a.timestamp);

      setFolders(uniqueFolders);
      setAllPhotos(allPhotos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []); // Dependencies rỗng vì hàm này không phụ thuộc vào state/props nào


  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]) // Bây giờ có thể thêm loadData vào đây
  );


  // Hàm mở modal đổi tên
  const handleRenameFolder = (folderName: string) => {
    setSelectedFolder(folderName);
    setNewFolderName(folderName);
    setRenameModalVisible(true);
  };

  // Hàm xác nhận đổi tên
  const confirmRenameFolder = async () => {
    if (!newFolderName.trim() || newFolderName === selectedFolder) {
      setRenameModalVisible(false);
      return;
    }

    try {
      // Kiểm tra tên mới đã tồn tại chưa
      if (folders.includes(newFolderName.trim())) {
        Alert.alert('Error', 'Folder name already exists.');
        return;
      }

      const photosDir = new Directory(Paths.document, 'photos');
      const oldFolder = new Directory(photosDir, selectedFolder);
      const newFolder = new Directory(photosDir, newFolderName.trim());

      if (!oldFolder.exists) {
        Alert.alert('Error', 'Source folder does not exist.');
        return;
      }

      if (newFolder.exists) {
        Alert.alert('Error', 'Destination folder already exists.');
        return;
      }

      await oldFolder.move(newFolder);

      const files = newFolder.list();
      const jsonFiles = files.filter((f): f is File => 
        f instanceof File && f.name.toLowerCase().endsWith('.json')
      );

      await Promise.all(
        jsonFiles.map(async (jsonFile) => {
          try {
            const content = await jsonFile.text();
            const metadata = JSON.parse(content);
            
            metadata.folder = newFolderName.trim();
            metadata.subject = newFolderName.trim();
            
            await jsonFile.write(JSON.stringify(metadata, null, 2));
          } catch (e) {
            console.error(`Error updating ${jsonFile.name}:`, e);
          }
        })
      );

      clearFolderCache(selectedFolder);
      clearFolderCache(newFolderName.trim());

      setFolders(prev => prev.map(f => f === selectedFolder ? newFolderName.trim() : f));
      
      Alert.alert('Success', 'Folder renamed successfully.');
    } catch (error) {
      console.error('Error renaming folder:', error);
      Alert.alert('Error', 'Failed to rename folder.');
    } finally {
      setRenameModalVisible(false);
      loadData(); // Refresh
    }
  };

  // Hàm mở modal xác nhận xóa
  const handleDeleteFolderClick = (folderName: string) => {
    setFolderToDelete(folderName);
    setDeleteModalVisible(true);
  };

  // Hàm xác nhận xóa folder
  // Hàm xóa folder (sau khi xác nhận)
  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;

    try {
      const photosDir = new Directory(Paths.document, 'photos');
      const folderToDeleteDir = new Directory(photosDir, folderToDelete);
      
      if (!folderToDeleteDir.exists) {
        Alert.alert('Error', 'Folder does not exist.');
        return;
      }

      const files = folderToDeleteDir.list();
      
      const fileDeletionPromises = files
        .filter((file): file is File => file instanceof File)
        .map(async (file) => {
          try {
            await file.delete();
          } catch (error) {
            console.error(`Error deleting ${file.name}:`, error);
            throw error;
          }
        });
      
      await Promise.all(fileDeletionPromises);
      
      folderToDeleteDir.delete();
      
      clearFolderCache(folderToDelete);
      
      setFolders(prev => prev.filter(f => f !== folderToDelete));
      setAllPhotos(prev => prev.filter(photo => photo.folderName !== folderToDelete));
      
      Alert.alert('Success', 'Folder deleted successfully.');
    } catch (error) {
      console.error('Error deleting folder:', error);
      Alert.alert('Error', 'Failed to delete folder.');
    } finally {
      setDeleteModalVisible(false);
      setFolderToDelete('');
    }
  };

  const filteredFolders = folders.filter((folderName) => 
    removeAccents(folderName).includes(removeAccents(searchQuery))
  );

  const filteredPhotos = allPhotos.filter((photo) => {
    const query = removeAccents(searchQuery);
    const noteMatch = photo.note ? removeAccents(photo.note).includes(query) : false;
    const subjectMatch = photo.subject ? removeAccents(photo.subject).includes(query) : false;
    const folderMatch = removeAccents(photo.folderName).includes(query);
    
    return noteMatch || subjectMatch || folderMatch;
  });




  const isSearching = searchQuery.length > 0;

  return (
    <View className="flex-1 px-5 pt-2">
      <SearchBar 
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search (notes, subjects)..." 
      />

      {/* Rename Folder Modal */}
      <Modal
        visible={renameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-[#fff8e3] rounded-2xl p-6 w-80">
            <Text className="text-xl font-bold text-primary mb-4">Rename Folder</Text>
            
            <TextInput
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Enter new folder name"
              className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
              autoFocus
            />
            
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity 
                onPress={() => setRenameModalVisible(false)}
                className="px-4 py-2 rounded-lg"
              >
                <Text className="text-gray-600">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={confirmRenameFolder}
                className="bg-primary px-4 py-2 rounded-lg"
              >
                <Text className="text-white">Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-[#fff8e3] rounded-2xl p-6 w-80">
            <Text className="text-xl font-bold text-primary mb-2">Delete Folder</Text>
            <Text className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{folderToDelete}&quot;? This action cannot be undone.
            </Text>
            
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity 
                onPress={() => setDeleteModalVisible(false)}
                className="px-4 py-2 rounded-lg"
              >
                <Text className="text-gray-600">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={confirmDeleteFolder}
                className="bg-primary px-4 py-2 rounded-lg"
              >
                <Text className="text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading ? (
        <View className="mt-10">
          <ActivityIndicator size="large" color="#AC3C00" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="mt-2">
          
          {/* TRƯỜNG HỢP 1: KHÔNG SEARCH -> HIỆN DANH SÁCH FOLDER (CŨ) */}
          {!isSearching && (
            <>
                {folders.length === 0 ? (
                    <Text className="text-center text-gray-400 mt-10 font-sen">
                    No folders yet. Take a photo to start!
                    </Text>
                ) : (
                    folders.map((folder) => (
                    <FolderCard 
                        key={folder} 
                        title={folder} 
                        link={`/sessionFolders/${folder}` as RelativePathString}
                        onEditPress={() => handleRenameFolder(folder)}
                        onDeletePress={() => handleDeleteFolderClick(folder)}
                        showActions={!isSearching}
                    />
                    ))
                )}
            </>
          )}

          {/* TRƯỜNG HỢP 2: ĐANG SEARCH -> HIỆN KẾT QUẢ ẢNH + FOLDER */}
          {isSearching && (
            <View>
                {/* A. Nếu tìm thấy Folder khớp tên -> Hiện Folder đó */}
                {filteredFolders.length > 0 && (
                    <View className="mb-6">
                        <Text className="font-sen font-bold text-gray-500 mb-2">Folders matches</Text>
                        {filteredFolders.map((folder) => (
                             <FolderCard key={folder} title={folder} link={`/sessionFolders/${folder}` as RelativePathString} />
                        ))}
                    </View>
                )}

                {/* B. Nếu tìm thấy Ảnh khớp Note -> Hiện Lưới ảnh */}
                <Text className="font-sen font-bold text-gray-500 mb-2">
                    Photos matches ({filteredPhotos.length})
                </Text>

                {filteredPhotos.length === 0 ? (
                    <Text className="text-center text-gray-400 mt-4 font-sen italic">
                        No photos found with this note.
                    </Text>
                ) : (
                    <View className="flex-row flex-wrap">
                        {filteredPhotos.map((photo, index) => {
                          const uniqueKey = `${photo.uri}-${photo.timestamp}-${index}`;
                          return (
                            <View 
                              key={uniqueKey}
                              className="w-[31%] m-[1%] aspect-square rounded-xl overflow-hidden relative"
                            >
                                <TouchableOpacity 
                                    activeOpacity={0.8}
                                    className="w-full h-full"
                                    onPress={() => {
                                        router.push({
                                            pathname: '/imageDetails' as RelativePathString,
                                            params: { uri: photo.uri } 
                                        });
                                    }}
                                >
                                    <Image source={{ uri: photo.uri }} className="w-full h-full" resizeMode="cover" />
                                </TouchableOpacity>
                            </View>
                          );
                        })}
                    </View>
                )}
            </View>
          )}
          
          <View className="h-20" />
        </ScrollView>
      )}
    </View>
  );
}