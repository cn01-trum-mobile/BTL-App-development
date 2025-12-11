import { RelativePathString, router } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { View, Text, TouchableOpacity } from 'react-native';

interface FolderCardProps {
  title: string;
  link: RelativePathString;
}

function randomInRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getWarmPastelColor() {
  // Define soft RGB bounds to stay within your range
  const r = randomInRange(255, 255); // keep red maxed for warmth
  const g = randomInRange(190, 230); // soft orange–peachy tone
  const b = randomInRange(180, 210); // gentle pink component
  return `rgb(${r}, ${g}, ${b})`;
}

export default function FolderCard({ title, link }: FolderCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        router.replace(link);
      }}
      className="relative flex-row items-center gap-4 p-4 rounded-[22.5px] h-[65px] mb-4"
      style={{ backgroundColor: getWarmPastelColor() }}
    >
      <View className="flex items-center justify-center w-[35px] h-[35px] rounded-[11.25px] bg-black/10">
        <Pencil size={16} color={'#35383E'} />
      </View>
      <Text className="flex-1 text-[#35383E] font-sen font-bold text-sm uppercase">{title}</Text>
    </TouchableOpacity>
  );
}
