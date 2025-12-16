import { Search } from 'lucide-react-native';
import { TextInput, TouchableOpacity, View } from 'react-native';

export function SearchBar() {
  return (
    <View className="relative mb-8">
      <TextInput
        placeholder="Search for your photos"
        placeholderTextColor={'#8D7162'}
        className="w-full h-[42px] px-4 pr-12 bg-white title-3 text-center rounded-md"
      />
      <TouchableOpacity activeOpacity={0.8} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center">
        <Search size={20} color={'#6E4A3F'} />
      </TouchableOpacity>
    </View>
  );
}
