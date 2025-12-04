import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import BottomNav from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { Directory, File, Paths } from 'expo-file-system';

export default function SessionFolderScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const [expandedSession, setExpandedSession] = useState<string[]>(['session-4']);
  const [photos, setPhotos] = useState<(File | Directory)[]>([]);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const dir = new Directory(Paths.document, 'photos');
      if (dir.exists) {
        const files = dir.list();
        setPhotos(files.reverse());
      }
    } catch (error) {
      console.error('Error loading photos: ', error);
    }
  };

  const categoryName =
    slug
      ?.split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') ?? 'Example';

  const sessions = [
    { id: 'session-4', title: 'Session 4 - 01/04/2025' },
    { id: 'session-3', title: 'Session 3 - 01/03/2025' },
    { id: 'session-2', title: 'Session 2 - 01/02/2025' },
    { id: 'session-1', title: 'Session 1 - 01/01/2025' },
  ];

  return (
    <View className="flex-1 px-5 pt-2">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
        <View className="gap-y-3">
          {sessions.map((session) => {
            const isExpanded = expandedSession.includes(session.id);
            const bgClass = isExpanded ? 'bg-[#8D7162]' : 'bg-[#FFD9B3]';
            const textClass = isExpanded ? 'text-white' : 'text-[#35383E]';

            return (
              <View key={session.id}>
                <TouchableOpacity
                  onPress={() => setExpandedSession((prev) => (isExpanded ? prev.filter((id) => id !== session.id) : [...prev, session.id]))}
                  activeOpacity={0.8}
                  className={`w-full flex-row items-center justify-between px-4 py-3 rounded-[22.5px] ${bgClass}`}
                >
                  <Text className={`font-sen font-bold text-sm uppercase ${textClass}`}>{session.title}</Text>
                  <ChevronDown size={24} color={isExpanded ? '#FFF' : '#8D7162'} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {isExpanded && (
                  <View className="flex-row flex-wrap gap-3 mt-4 mb-6">
                    {photos.map((photo, index) => (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.8}
                        className="w-[30%] aspect-square rounded-2xl overflow-hidden"
                        onPress={() =>
                          router.push({
                            pathname: '/image-details',
                            params: { uri: photo.uri, name: photo.name || `photo-${index}` },
                          })
                        }
                      >
                        <Image source={{ uri: photo.uri }} className="w-full h-full" resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}
