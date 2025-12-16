import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
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
  id: string; // "2025-12-09"
  title: string; // "Session - 09/12/2025"
  photos: PhotoItem[];
}

export default function SessionFolderScreen() {
  const { folderName } = useLocalSearchParams<{ folderName: string }>();
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [expandedSession, setExpandedSession] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Get photo metadata
  const getPhotoMetadata = async (imageUri: string) => {
    try {
      // 1. Construct the path to the JSON sidecar file
      // Example: .../photos/math/IMG_123.jpg -> .../photos/math/IMG_123.json
      const jsonUri = imageUri.replace(/\.jpg$/i, '.json');
      const jsonFile = new File(jsonUri);

      // 2. Check if the note file actually exists
      if (!jsonFile.exists) {
        return null;
      }

      // 3. Read and Parse
      const content = await jsonFile.text();
      const metadata = JSON.parse(content);

      return metadata; // Returns { note: "...", createdAt: "...", ... }
    } catch (error) {
      console.error('Error reading metadata:', error);
      return null;
    }
  };

  useEffect(() => {
    loadAndGroupPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderName]);

  // Get photo
  const loadAndGroupPhotos = async () => {
    try {
      // Find subject folder
      if (!folderName) return;
      const photosDir = new Directory(Paths.document, 'photos');
      const subjectDir = new Directory(photosDir, folderName);
      if (!subjectDir.exists) {
        return;
      }
      // Get all photos
      const files = subjectDir.list();
      const photoFiles = files.filter((f) => f instanceof File && f.name.endsWith('.jpg'));
      // Process Files & Extract Timestamps
      const allPhotos: PhotoItem[] = photoFiles.map((file) => {
        // Filename format: IMG_1733762432000.jpg
        const nameParts = file.name.replace('.jpg', '').split('_');
        const timestamp = parseInt(nameParts[1] || '0');
        return {
          uri: file.uri,
          timestamp: timestamp,
        };
      });
      // 3. Sort Descending (Newest first)
      allPhotos.sort((a, b) => b.timestamp - a.timestamp);
      // 4. Group by Date
      const groups: Record<string, PhotoItem[]> = {};
      allPhotos.forEach((photo) => {
        const date = new Date(photo.timestamp);
        // Key for grouping: "2025-12-09"
        const dateKey = format(date, 'yyyy-MM-dd');
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(photo);
      });

      // 5. Convert to Array for Rendering
      const result: SessionGroup[] = Object.keys(groups).map((dateKey, index) => {
        const dateObj = new Date(dateKey);
        // Calculate "Session X" number (optional logic, here simple count)
        const sessionNumber = Object.keys(groups).length - index;

        return {
          id: dateKey,
          title: `Session ${sessionNumber} - ${format(dateObj, 'dd/MM/yyyy')}`,
          photos: groups[dateKey],
        };
      });
      // Sort Groups (Newest date first)
      result.sort((a, b) => b.id.localeCompare(a.id));
      setSessionGroups(result);
      // Auto-expand the first (newest) session
      if (result.length > 0) {
        setExpandedSession([result[0].id]);
      }
    } catch (error) {
      console.error('Error loading photos: ', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryName = folderName.split('_').join(' ');
  const toggleSession = (id: string) => {
    setExpandedSession((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <View className="flex-1 px-5 pt-2">
      {/* Header */}
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

      {/* Sessions */}
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
                            <TouchableOpacity activeOpacity={0.8} onPress={async () => console.log(await getPhotoMetadata(photo.uri))}>
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
