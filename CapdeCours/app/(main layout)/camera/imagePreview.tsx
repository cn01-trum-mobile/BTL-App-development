import { useBottomAction } from '@/context/NavActionContext';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Image } from 'react-native';
import { File, Paths, Directory } from 'expo-file-system';
import { Check, Download } from 'lucide-react-native';
import { Alert } from '@/components/Alert';

export default function ImagePreviewScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const { setAction, resetAction } = useBottomAction();
  const [visible, setVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    setAction({
      icon: <Download size={24} color={'white'} strokeWidth={2} />,
      onPress: savePhoto,
    });
    return resetAction;
  }, [uri]);

  const savePhoto = () => {
    if (!uri) return;
    try {
      const filename = uri.split('/').pop() ?? `photo_${Date.now()}.jpg`;
      // Create File for source
      const sourceFile = new File(uri);
      // Destination directory
      const destDir = new Directory(Paths.document, 'photos');
      if (!destDir.exists) {
        destDir.create({ intermediates: true });
      }
      // Destination file
      const destFile = new File(destDir, filename);
      // Copy source to destination
      if (!destFile.exists) {
        sourceFile.copy(destFile);
      }
      // Alert
      setAction({ icon: <Check size={24} color={'white'} strokeWidth={2} />, onPress: () => {} });
      setVisible(true);
      setMessage(`Stored at folder\n"${destFile.uri}"`);
    } catch (error) {
      console.error('Error saving photo:', error);
    }
  };

  return (
    <View className="flex-1">
      <Image source={{ uri }} className="flex-1 rounded-xl overflow-hidden" />
      <Alert
        message={message}
        visible={visible}
        onDismiss={() => {
          setVisible(false);
          router.replace('/camera');
        }}
      />
    </View>
  );
}
