import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useBottomAction } from '@/context/NavActionContext';
import { ScanLine } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [type, setType] = useState<CameraType>('back');
  // const [zoom, setZoom] = useState(0);
  // const [lastZoom, setLastZoom] = useState(0);
  const { setAction, resetAction } = useBottomAction();

  useEffect(() => {
    setAction({
      icon: <ScanLine size={24} color="rgba(66,22,13,0.75)" strokeWidth={2} />,
      onPress: async () => {
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync({ exif: true });
          router.replace({ pathname: '/camera/imagePreview', params: { uri: photo.uri, rotation: photo.exif.Orientation } });
        }
      },
    });
    return resetAction;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const swipeGesture = Gesture.Pan().onEnd((event) => {
    const { translationX } = event;
    if (translationX < -80 || translationX > 80) {
      scheduleOnRN(setType, type === 'front' ? 'back' : 'front');
    }
  });
  // const pinchGesture = Gesture.Pinch().onChange((event) => {
  //   if (event.velocity < 0) scheduleOnRN(setLastZoom, Math.min(Math.max(lastZoom - event.scale / 200, 0), 1));
  //   else if (event.velocity > 0) scheduleOnRN(setLastZoom, Math.min(Math.max(lastZoom + event.scale / 200, 0), 1));
  //   scheduleOnRN(setZoom, lastZoom);
  // });

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

  return (
    <GestureDetector gesture={Gesture.Simultaneous(swipeGesture)}>
      <CameraView style={{ flex: 1, borderRadius: 12 }} ref={cameraRef} facing={type} autofocus="on" mirror={true} />
    </GestureDetector>
  );
}
