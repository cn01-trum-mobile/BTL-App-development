import FolderCard from '@/components/Folder';
import { SearchBar } from '@/components/SearchBar';
import { ScrollView, View } from 'react-native';

export default function GalleryScreen() {
  return (
    <View className="flex-1">
      <SearchBar />
      <ScrollView showsVerticalScrollIndicator={false}>
        <FolderCard title="react ffffffffffffffffff" link="/sessionFolders" />
        <FolderCard title="react ffffffffffffffffff" link="/gallery" />
        <FolderCard title="react ffffffffffffffffff" link="/gallery" />
        <FolderCard title="react ffffffffffffffffff" link="/gallery" />
        <FolderCard title="react ffffffffffffffffff" link="/gallery" />
        <FolderCard title="react ffffffffffffffffff" link="/gallery" />
        <FolderCard title="react ffffffffffffffffff" link="/gallery" />
        <FolderCard title="react ffffffffffffffffff" link="/gallery" />
        <FolderCard title="react ffffffffffffffffff" link="/gallery" />
      </ScrollView>
    </View>
  );
}
