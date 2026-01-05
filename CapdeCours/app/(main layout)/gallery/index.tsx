import FolderCard from '@/components/Folder';
import { SearchBar } from '@/components/SearchBar';
import { Directory, Paths } from 'expo-file-system';
import { RelativePathString, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View, Text, Image, TouchableOpacity } from 'react-native';
import { File} from 'expo-file-system';
import { getPhotosFromCache, PhotoItem,  savePhotosToCache } from '@/utils/photoCache';

interface GlobalPhotoItem extends PhotoItem {
  folderName: string;
}

export default function GalleryScreen() {
  const [folders, setFolders] = useState<string[]>([]);
  const [allPhotos, setAllPhotos] = useState<GlobalPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      
      console.log(`🔨 Rebuilding cache for "${folderName}": ${jsonFiles.length} json files found`);
      
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

  const loadData = async () => {
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

      console.log('📁 Found folders in filesystem:', folderNames);

      const validFolders: string[] = [];
      const allPhotos: GlobalPhotoItem[] = [];

      for (const folderName of folderNames) {
        const hasPhotos = await checkFolderHasPhotos(folderName);
        
        console.log(`📂 Folder "${folderName}": hasPhotos = ${hasPhotos}`);
        
        if (hasPhotos) {
          validFolders.push(folderName);
          
          const photos = await getPhotosFromCache(folderName);
          console.log(`📂 Folder "${folderName}": ${photos?.length || 0} photos in cache`);

          if (!photos || photos.length === 0) {
            console.log(`🔄 Cache empty, rebuilding for "${folderName}"...`);
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
        } else {
          console.log(`Skipping folder "${folderName}" as it has no photos.`);
        }
      }

      // Sửa: Loại bỏ folder trùng lặp (nếu có)
      const uniqueFolders = Array.from(new Set(validFolders));
      
      uniqueFolders.sort((a, b) => a.localeCompare(b));
      allPhotos.sort((a, b) => b.timestamp - a.timestamp);

      console.log('✅ Final unique folders:', uniqueFolders);
      setFolders(uniqueFolders);
      setAllPhotos(allPhotos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };


  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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