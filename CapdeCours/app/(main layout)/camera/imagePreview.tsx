import { CameraCapturedPicture } from 'expo-camera';
import { View, Image } from 'react-native';

export default function ImagePreviewScreen({ photo, handleRetakePhoto }: { photo: CameraCapturedPicture; handleRetakePhoto: () => void }) {
  return (
    <View className="flex-1">
      <Image source={{ uri: photo.uri }} className="flex-1" />
    </View>
  );
}
