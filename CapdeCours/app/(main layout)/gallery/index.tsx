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
      // 1. Safety Check: If "photos" folder doesn't exist yet, create it and stop
      if (!photosDir.exists) {
        photosDir.create();
        setFolders([]);
        return;
      }
      // 2. Get list of contents
      const contents = photosDir.list(); // Returns (File | Directory)[]
      // 3. Filter ONLY directories (ignore loose files)
      const folderList: string[] = [];
      for (const item of contents) {
        if (item instanceof Directory) {
          folderList.push(item.name);
        }
      }
      setFolders(folderList);
    } catch (e) {
      console.error('Error loading gallery:', e);
    } finally {
      setLoading(false);
    }
  };

  // 4. useFocusEffect: Runs every time you navigate TO this screen
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
          {folders.length === 0 && <Text className="text-center text-gray-400 mt-10 font-sen">No folders yet. Take a photo to start!</Text>}

          {/* Render List */}
          {folders.map((folder) => (
            <FolderCard key={folder} title={`${folder}`} link={`/sessionFolders/${folder}` as RelativePathString} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
