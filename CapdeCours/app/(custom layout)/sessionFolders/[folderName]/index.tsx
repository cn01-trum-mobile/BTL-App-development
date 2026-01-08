import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl, Keyboard } from 'react-native';
import { useLocalSearchParams, router, RelativePathString, useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import BottomNav from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { Directory, File, Paths } from 'expo-file-system';
import { format } from 'date-fns';
import { getPhotosFromCache, savePhotosToCache, PhotoItem, clearFolderCache } from '@/utils/photoCache';

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
      console.log(e);
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

      // Sắp xếp Session từ CŨ -> MỚI để đánh số
      const sortedDatesAsc = Object.keys(groups).sort((a, b) => a.localeCompare(b));

      // Tạo mảng hiển thị
      const result: SessionGroup[] = sortedDatesAsc.map((dateKey, index) => {
        // Sort ảnh trong session (Mới nhất lên đầu)
        groups[dateKey].sort((a, b) => b.timestamp - a.timestamp);

        return {
          id: dateKey,
          title: formatSessionDisplay(dateKey, index),
          photos: groups[dateKey],
        };
      });

      // Đảo ngược để Session mới nhất lên đầu UI
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
  }, [folderName]); // CHỈ CÓ folderName, không có searchQuery

  useEffect(() => {
    loadAndGroupPhotos();
  }, [folderName]); // CHỈ phụ thuộc vào folderName

  // Effect riêng cho search - tự động mở tất cả session khi tìm kiếm
  useEffect(() => {
    if (searchQuery) {
      const sessionIds = sessionGroups.map(s => s.id);
      setExpandedSession(sessionIds);
    } else {
      // Khi không search, mở session đầu tiên
      if (sessionGroups.length > 0) {
        setExpandedSession([sessionGroups[0].id]);
      }
    }
  }, [searchQuery]); // RIÊNG BIỆT với loadAndGroupPhotos

  // useFocusEffect chỉ để cleanup hoặc xử lý đặc biệt
  useFocusEffect(
    useCallback(() => {
      // Không gọi loadAndGroupPhotos ở đây để tránh trùng lặp
      return () => {
        // Cleanup nếu cần
      };
    }, [folderName])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    clearFolderCache(folderName!).then(() => {
      loadAndGroupPhotos(true);
    });
  }, [folderName, loadAndGroupPhotos]);


  // Hàm kiểm tra text có chứa query không (tìm theo substring hoặc từng từ)
  const matchesSearch = (text: string, query: string): boolean => {
    if (!text || !query) return false;
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    
    // Tìm substring (đã có sẵn)
    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }
    
    // Tìm theo từng từ riêng lẻ (tất cả từ trong query phải xuất hiện trong text)
    const queryWords = normalizedQuery.trim().split(/\s+/).filter(w => w.length > 0);
    if (queryWords.length > 1) {
      return queryWords.every(word => normalizedText.includes(word));
    }
    
    return false;
  };

  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessionGroups;
    
    return sessionGroups.map((group) => {
      if (matchesSearch(group.title, searchQuery)) {
        return group;
      }

      const matchingPhotos = group.photos.filter(p => {
        const noteMatch = p.note ? matchesSearch(p.note, searchQuery) : false;
        const subjectMatch = p.subject ? matchesSearch(p.subject, searchQuery) : false;
        const nameMatch = p.name ? matchesSearch(p.name, searchQuery) : false;
        return noteMatch || subjectMatch || nameMatch;
      });

      if (matchingPhotos.length > 0) {
        return { ...group, photos: matchingPhotos };
      }
      
      return null;
    }).filter((g): g is SessionGroup => g !== null);
  }, [sessionGroups, searchQuery]);

  
  const categoryName = folderName?.split('_').join(' ') || '';

  const toggleSession = (id: string) => {
    setExpandedSession((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <View className="flex-1 px-5 pt-2">
      <View className="flex-1 px-4 pt-3">
      
        <View className="flex-row items-center gap-4 mb-5">
          <TouchableOpacity
            onPress={() => router.replace('/gallery')}
            activeOpacity={0.8}
            className="w-[35px] h-[35px] rounded-[8px] bg-[#F2F2F2] flex items-center justify-center"
          >
            <ChevronLeft size={24} color="#35383E" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-sm font-sen font-bold uppercase text-[#35383E] tracking-wider">{categoryName}</Text>
            <View className="w-full h-[3px] bg-[#D2B48C] mt-1 opacity-80"></View>
          </View>
        </View>

        <View className="mb-2">
          <SearchBar 
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for your photos" 
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
                        className={`w-full flex-row items-center justify-between px-5 py-4 rounded-2xl ${bgClass}`}
                      >
                        <Text className={`font-sen font-bold text-sm uppercase ${textClass}`}>{session.title}</Text>
                
                        {isExpanded ? (
                          <ChevronDown size={20} color={'#35383E'} />
                        ) : (
                          <ChevronLeft size={20} color={'#35383E'} />
                        )}
                      </TouchableOpacity>

                      {isExpanded && (
                        <View className="flex-row flex-wrap mt-3 mb-4 pl-2">
                          {session.photos.map((photo, index) => (
                            <View key={`${photo.uri}-${index}`} className="w-[30%] m-[1.5%] aspect-square rounded-xl overflow-hidden">
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                  // Ẩn keyboard trước khi navigate
                                  Keyboard.dismiss();
                                  // Chuyển hướng sang màn hình chi tiết
                                  router.push({
                                    pathname: '/imageDetails' as RelativePathString,
                                    params: { uri: photo.uri },
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
            <View className="h-20" />
          </ScrollView>
        )}
      </View>

      <View className="absolute bottom-0 left-0 right-0 h-[70px]">
         <BottomNav />
      </View>
    </View>
  );
}