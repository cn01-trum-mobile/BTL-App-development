import { Search, X } from 'lucide-react-native'; 
import { TextInput, TouchableOpacity, View } from 'react-native';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ 
  value, 
  onChangeText, 
  placeholder = "Search..." 
}: SearchBarProps) => {
  return (
    <View className="relative flex-row items-center bg-white rounded-full px-4 h-[50px] mb-5">
      {/* Icon kính lúp bên trái: OK */}
      <Search size={20} color="#6E4A3F" />
      
      <TextInput
        className="flex-1 font-sen text-center text-[#6E4A3F]"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6E4A3F"
      />

      {value && value.length > 0 && (
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => onChangeText && onChangeText('')} 
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200"
        >
          {/* Đổi icon Search thành X */}
          <X size={16} color={'#6E4A3F'} />
        </TouchableOpacity>
      )}
    </View>
  );
};