import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, CameraCapturedPicture } from 'expo-camera';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);

  const takePhoto = async () => {
    console.log('press');
    if (cameraRef.current) {
      const picture = await cameraRef.current.takePictureAsync();
      // router.push({ pathname: '/camera/imagePreview', params: { uri: picture.uri } });
    }
  };
  // const retakePhoto = () => setPhoto(null);

  if (!permission) {
    return <View></View>;
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

  return (
    <View className="flex-1">
      <CameraView style={{ flex: 1 }} facing={type} autofocus="on" />
    </View>
  );
}
