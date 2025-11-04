import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useBottomAction } from '@/context/NavActionContext';
import { ScanLine } from 'lucide-react-native';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const { setAction, resetAction } = useBottomAction();

  useEffect(() => {
    setAction({
      icon: <ScanLine size={24} color="rgba(66,22,13,0.75)" strokeWidth={2} />,
      onPress: async () => {
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync();
          router.replace({ pathname: '/camera/imagePreview', params: { uri: photo.uri } });
        }
      },
    });
    return resetAction;
  }, []);

  // const retakePhoto = () => setPhoto(null);

  if (!permission) {
    return <View />;
  }
  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-[16px] font-sen text-[#646982] text-center leading-6 mb-5 px-1">We need your permission to use the camera</Text>
        <TouchableOpacity onPress={requestPermission} activeOpacity={0.9} className="px-6 h-[62px] rounded-xl bg-primary items-center justify-center">
          <Text className="text-white font-sen text-[14px] font-bold uppercase opacity-80">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // function toggleCameraFacing() {
  //   setType((current) => (current === 'back' ? 'front' : 'back'));
  // }

  return <CameraView style={{ flex: 1, borderRadius: 12 }} ref={cameraRef} facing={'back'} autofocus="on" />;
}
