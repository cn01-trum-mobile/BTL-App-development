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

  const photo1s = [
    'https://api.builder.io/api/v1/image/assets/TEMP/132815e7ef6fa1900f2c7340c468cc1cbc527a97?width=210',
    'https://api.builder.io/api/v1/image/assets/TEMP/c1b66f9aa6db706b15fe08670befb0a1007ca753?width=210',
    'https://api.builder.io/api/v1/image/assets/TEMP/3ad58b19ad17852e1f476625f00b0766f0d346ae?width=210',
    'https://api.builder.io/api/v1/image/assets/TEMP/d223b52acfc20eee92b7fd60b80537b8c62a9f37?width=210',
    'https://api.builder.io/api/v1/image/assets/TEMP/e6e71e20a5075073b7582d087e25835455d9ea14?width=210',
    'https://api.builder.io/api/v1/image/assets/TEMP/abd9af2e4c8a9aace65446c8719e38e7407959f5?width=210',
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
                      <View key={index} className="w-[32%] aspect-square rounded-2xl overflow-hidden">
                        <Image source={{ uri: photo.uri }} className="w-full h-full" resizeMode="cover" />
                      </View>
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
