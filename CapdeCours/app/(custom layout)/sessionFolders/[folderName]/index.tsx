import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, RelativePathString } from 'expo-router';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import BottomNav from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { Directory, File, Paths } from 'expo-file-system';
import { format } from 'date-fns';

interface PhotoItem {
  uri: string;
  timestamp: number;
}

interface SessionGroup {
  id: string; // Session ID (VD: "2025-12-24") lấy từ JSON
  title: string;
  photos: PhotoItem[];
}

export default function SessionFolderScreen() {
  const { folderName } = useLocalSearchParams<{ folderName: string }>();
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [expandedSession, setExpandedSession] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper để đọc JSON (chuyển ra ngoài hoặc để trong đều được)
  const readMetadata = async (jsonFile: File): Promise<{ session: string; time: string } | null> => {
    try {
      const content = await jsonFile.text();
      return JSON.parse(content);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    loadAndGroupPhotos();
  }, [folderName]);

  const loadAndGroupPhotos = async () => {
    try {
      if (!folderName) return;
      const photosDir = new Directory(Paths.document, 'photos');
      const subjectDir = new Directory(photosDir, folderName);

      if (!subjectDir.exists) {
        setSessionGroups([]);
        return;
      }

      // 1. Lấy danh sách tất cả file
      const allFiles = subjectDir.list();

      // 2. Lọc ra các file JSON (Metadata)
      const jsonFiles = allFiles.filter((f): f is File => f instanceof File && f.name.endsWith('.json'));
      const processedPhotos: { session: string; timestamp: number; uri: string }[] = [];

      // 3. Đọc nội dung từng file JSON (Dùng Promise.all để đọc song song cho nhanh)
      await Promise.all(
        jsonFiles.map(async (jsonFile) => {
          // Tìm file ảnh tương ứng (Giả sử tên file json và jpg giống nhau chỉ khác đuôi)
          // VD: IMG_123.json -> IMG_123.jpg
          const imageUri = jsonFile.uri.replace('.json', '.jpg');
          const imageFile = new File(imageUri);

          // Chỉ xử lý nếu file ảnh thực sự tồn tại
          if (imageFile.exists) {
            const metadata = await readMetadata(jsonFile);
            if (metadata && metadata.session) {
              processedPhotos.push({
                uri: imageUri,
                session: metadata.session, // Lấy SESSION từ JSON
                timestamp: new Date(metadata.time).getTime(), // Lấy TIME từ JSON
              });
            }
          }
        })
      );

      // 4. Group ảnh theo Session (Dữ liệu lấy từ JSON)
      const groups: Record<string, PhotoItem[]> = {};

      processedPhotos.forEach((item) => {
        const sessionKey = item.session; // "2025-12-24"

        if (!groups[sessionKey]) {
          groups[sessionKey] = [];
        }
        groups[sessionKey].push({
          uri: item.uri,
          timestamp: item.timestamp,
        });
      });

      // 5. Sắp xếp Session từ CŨ -> MỚI để đánh số
      const sortedDatesAsc = Object.keys(groups).sort((a, b) => a.localeCompare(b));

      // 6. Tạo mảng hiển thị
      const result: SessionGroup[] = sortedDatesAsc.map((dateKey, index) => {
        const sessionNumber = index + 1;
        let dateDisplay = dateKey;
        try {
          dateDisplay = format(new Date(dateKey), 'dd/MM/yyyy');
        } catch {}

        // Sort ảnh trong session (Mới nhất lên đầu)
        groups[dateKey].sort((a, b) => b.timestamp - a.timestamp);

        return {
          id: dateKey,
          title: `Session ${sessionNumber} - ${dateDisplay}`,
          photos: groups[dateKey],
        };
      });

      // 7. Đảo ngược để Session mới nhất lên đầu UI
      result.reverse();

      setSessionGroups(result);
      if (result.length > 0) setExpandedSession([result[0].id]);
    } catch (error) {
      console.error('Error loading photos: ', error);
    } finally {
      setLoading(false);
    }
  };

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
        <SearchBar />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#AC3C00" className="mt-10" />
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {sessionGroups.length === 0 ? (
            <Text className="text-center text-gray-400 mt-10 font-sen">No photos found.</Text>
          ) : (
            <View className="gap-y-3">
              {sessionGroups.map((session) => {
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
