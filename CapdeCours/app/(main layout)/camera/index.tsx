import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useBottomAction } from '@/context/NavActionContext';
import { ScanLine, SwitchCamera } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [type, setType] = useState<CameraType>('back');
  const { setAction, setDisabled, resetAction } = useBottomAction();
  const [zoom, setZoom] = useState(0);
  const [lastZoom, setLastZoom] = useState(0);
  const [showZoom, setShowZoom] = useState(false);

  useEffect(() => {
    setAction({
      icon: <ScanLine size={24} color="#6E4A3F" strokeWidth={2} />,
      onPress: async () => {
        if (cameraRef.current) {
          setDisabled(true);
          const photo = await cameraRef.current.takePictureAsync({ exif: true });
          setDisabled(false);
          router.replace({ pathname: '/camera/imagePreview', params: { uri: photo.uri, rotation: photo.exif.Orientation } });
        }
      },
    });
    return resetAction;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scheduleOnRN(setType, type === 'front' ? 'back' : 'front');
    });
  const pinchGesture = Gesture.Pinch()
    .onStart(() => scheduleOnRN(setShowZoom, true))
    .onUpdate((event) => {
      let nextZoom = lastZoom + (event.scale - 1) / 5; // tweak sensitivity here
      // console.log(nextZoom);
      if (nextZoom < 0) nextZoom = 0;
      if (nextZoom > 1) nextZoom = 1;
      scheduleOnRN(setZoom, nextZoom);
    })
    .onEnd(() => {
      scheduleOnRN(setShowZoom, false);
      scheduleOnRN(setLastZoom, zoom);
    });

  if (!permission) {
    return <View />;
  }
  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="sub-title text-gray-button text-center mb-5 px-1">We need your permission to use the camera</Text>
        <TouchableOpacity onPress={requestPermission} activeOpacity={0.9} className="px-6 h-[62px] rounded-xl bg-primary items-center justify-center">
          <Text className="text-white button-text">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureDetector gesture={Gesture.Simultaneous(doubleTapGesture, pinchGesture)}>
      <View className="flex-1">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setType(type === 'front' ? 'back' : 'front')}
          className="absolute right-5 top-5 z-10 rounded-full border-3 bg-secondary-beige p-1"
        >
          <SwitchCamera size={24} strokeWidth={2} color={'#6E4A3F'} />
        </TouchableOpacity>
        {showZoom && (
          <View className="w-3 absolute bottom-5 right-5 h-3/4 bg-primary-brown z-10 rounded-md flex-col-reverse">
            <View className="bg-secondary-beige rounded-md" style={{ height: `${zoom * 100}%` }}></View>
          </View>
        )}
        <CameraView style={{ flex: 1, borderRadius: 12 }} ref={cameraRef} facing={type} autofocus="on" mirror={true} zoom={zoom} />
      </View>
    </GestureDetector>
  );
}
