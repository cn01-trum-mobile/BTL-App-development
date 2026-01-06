import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, router, RelativePathString } from 'expo-router';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import BottomNav from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { Directory, File, Paths } from 'expo-file-system';
import { format } from 'date-fns';
import { getPhotosFromCache, savePhotosToCache, PhotoItem, clearFolderCache } from '@/utils/photoCache'; 
import { useFocusEffect } from 'expo-router';

interface SessionGroup {
  id: string; 
  title: string;
  photos: PhotoItem[];
}

const formatSessionDisplay = (sessionKey: string, index: number): string => {
  if (!sessionKey || sessionKey === 'unknown' || sessionKey === '') {
    return `Session ${index + 1} - Unknown date`;
  }
  
  let dateObj: Date;
  dateObj = new Date(sessionKey);
  
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date(sessionKey + 'T00:00:00Z');
  }
  
  if (!isNaN(dateObj.getTime())) {
    try {
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      return `Session ${index + 1} - ${day}/${month}/${year}`;
    } catch {
      return `Session ${index + 1} - ${sessionKey}`;
    }
  }
  return `Session ${index + 1} - ${sessionKey}`;
};


export default function SessionFolderScreen() {
  const { folderName } = useLocalSearchParams<{ folderName: string }>();
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [expandedSession, setExpandedSession] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const readMetadata = async (jsonFile: File): Promise<{ session: string; time: string; note?: string; subject?: string } | null> => {
    try {
      const content = await jsonFile.text();
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  };


  const loadAndGroupPhotos = useCallback(async (forceReload = false) => {
    try {
      if (!folderName) return;
      setLoading(true);
      let photosData: PhotoItem[] | null = null;
      
      if (!forceReload) {
        photosData = await getPhotosFromCache(folderName);
      }
      if (!photosData || photosData.length === 0) {
        console.log('Cache miss or refresh -> Scanning files...');
        
        const photosDir = new Directory(Paths.document, 'photos');
        const subjectDir = new Directory(photosDir, folderName);

        if (!subjectDir.exists) {
          setSessionGroups([]);
          setLoading(false);
          return;
        }

        const allFiles = subjectDir.list();
        const jsonFiles = allFiles.filter((f): f is File => f instanceof File && f.name.endsWith('.json'));
        
        const scannedPhotos: PhotoItem[] = [];
        await Promise.all(
          jsonFiles.map(async (jsonFile) => {
            const imageUri = jsonFile.uri.replace('.json', '.jpg');
            const imageFile = new File(imageUri);

            if (imageFile.exists) {
              const metadata = await readMetadata(jsonFile);
              if (metadata) {
                scannedPhotos.push({
                  uri: imageUri,
                  name: imageFile.name,
                  timestamp: new Date(metadata.time).getTime(),
                  note: metadata.note || '',      
                  subject: metadata.subject || folderName,
                  session: metadata.session || format(new Date(metadata.time), 'yyyy-MM-dd'),
                });
              }
            }
          })
        );

        photosData = scannedPhotos;
        await savePhotosToCache(folderName, photosData);
      } else {
        console.log('Loaded from Cache');
      }
      const groups: Record<string, PhotoItem[]> = {};

      photosData.forEach((photo) => {
        const sessionKey = photo.session || 'unknown';

        if (!groups[sessionKey]) {
          groups[sessionKey] = [];
        }
        groups[sessionKey].push(photo);
      });

      // 5. Sắp xếp Session từ CŨ -> MỚI để đánh số
      const sortedDatesAsc = Object.keys(groups).sort((a, b) => a.localeCompare(b));

      // 6. Tạo mảng hiển thị
      const result: SessionGroup[] = sortedDatesAsc.map((dateKey, index) => {
        // let dateDisplay = dateKey;
        // try {
        //   const dateObj = new Date(dateKey);
        //   if (!isNaN(dateObj.getTime())) {
        //     dateDisplay = format(dateObj, 'dd/MM/yyyy');
        //   }
        // } catch {}

        // Sort ảnh trong session (Mới nhất lên đầu)
        groups[dateKey].sort((a, b) => b.timestamp - a.timestamp);

        return {
          id: dateKey,
          title: formatSessionDisplay(dateKey, index),
          photos: groups[dateKey],
        };
      });

      // 7. Đảo ngược để Session mới nhất lên đầu UI
      result.reverse();

      setSessionGroups(result);
      if (result.length > 0 && !searchQuery) {
        setExpandedSession([result[0].id]);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [folderName]);

  useEffect(() => {
    loadAndGroupPhotos();
  }, [folderName]);

  const onRefresh = () => {
    setRefreshing(true);
    clearFolderCache(folderName!).then(() => {
        loadAndGroupPhotos(true);
    });
  };

  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        if (folderName) {
          await clearFolderCache(folderName);
          loadAndGroupPhotos(true); // force reload
        }
      };
      refreshData();
    }, [folderName, loadAndGroupPhotos])
  );

  const filteredSessions = sessionGroups.map((group) => {
    const query = searchQuery.toLowerCase();
    

    if (group.title.toLowerCase().includes(query)) {
        return group; 
    }

    // 2. Nếu Session không khớp, lọc từng ảnh bên trong (Tìm Note)
    const matchingPhotos = group.photos.filter(p => {
        const noteMatch = p.note?.toLowerCase().includes(query);
        const subjectMatch = p.subject?.toLowerCase().includes(query);
        return noteMatch || subjectMatch;
    });

    if (matchingPhotos.length > 0) {
        return { ...group, photos: matchingPhotos };
    }
    
    return null;
  }).filter((g): g is SessionGroup => g !== null);

  // Tự động mở tất cả session khi đang tìm kiếm
  useEffect(() => {
    if (searchQuery) {
        setExpandedSession(filteredSessions.map(s => s.id));
    }
  }, [searchQuery]);

  const categoryName = folderName?.split('_').join(' ') || '';

  const toggleSession = (id: string) => {
    setExpandedSession((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <View className="flex-1 px-5 pt-2">
      <View>
        <View className="flex-row items-center gap-4 mb-5">
          <TouchableOpacity
            onPress={() => router.replace('/gallery')}
            activeOpacity={0.8}
            className="w-[35px] h-[35px] rounded-[11.25px] bg-[rgba(62,53,58,0.1)] flex items-center justify-center"
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-sm font-sen font-bold uppercase text-[#35383E]">{categoryName}</Text>
            <View className="w-full h-1 bg-[#8D7162]/50 rounded-full mt-1"></View>
          </View>
        </View>

        <SearchBar 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search note, session..." 
        />
        
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#AC3C00" className="mt-10" />
      ) : (
        <ScrollView 
            className="flex-1" 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} 
        >
          {filteredSessions.length === 0 ? (
            <Text className="text-center text-gray-400 mt-10 font-sen">
              {searchQuery ? 'No matching photos found.' : 'No photos in this folder yet.'}
            </Text>
          ) : (
            <View className="gap-y-3">
              {filteredSessions.map((session) => {
                const isExpanded = expandedSession.includes(session.id);
                const bgClass = isExpanded ? 'bg-[#714E43]' : 'bg-[#FFD9B3]';
                const textClass = isExpanded ? 'text-white' : 'text-[#35383E]';

                return (
                  <View key={session.id}>
                     <TouchableOpacity
                      onPress={() => toggleSession(session.id)}
                      activeOpacity={0.8}
                      className={`w-full flex-row items-center justify-between px-4 py-3 rounded-[22.5px] ${bgClass}`}
                    >
                      <Text className={`font-sen font-bold text-sm uppercase ${textClass}`}>{session.title}</Text>
                      {isExpanded ? <ChevronDown size={24} color={'#fff'} /> : <ChevronLeft size={24} color={'#714E43'} />}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View className="flex-row flex-wrap mt-4 mb-6">
                        {session.photos.map((photo, index) => (
                          <View key={index} className="w-[30%] m-[1.5%] aspect-square rounded-2xl overflow-hidden">
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                // Chuyển hướng sang màn hình chi tiết
                                router.push({
                                  pathname: '/imageDetails' as RelativePathString, // Trỏ tới file app/imageDetails/index.tsx
                                  params: { uri: photo.uri }, // Truyền đường dẫn ảnh sang
                                });
                              }}
                            >
                              <Image source={{ uri: photo.uri }} className="w-full h-full" resizeMode="cover" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}
