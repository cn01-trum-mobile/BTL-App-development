import { useBottomAction } from '@/context/NavActionContext';
import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { File, Paths, Directory } from 'expo-file-system';
import { BookOpen, BookText, Check, Download, X } from 'lucide-react-native';
import { Alert } from '@/components/Alert';
import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { endOfDay, startOfDay } from 'date-fns';

export default function ImagePreviewScreen() {
  const { uri, rotation } = useLocalSearchParams<{ uri: string; rotation: string }>();
  const { setAction, resetAction } = useBottomAction();
  const [visible, setVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const sideWay = ['1', '3', '2', '4'];
  const [events, setEvents] = useState<Calendar.Event[]>([]);

  const savePhoto = useCallback(() => {
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
      setAction({
        icon: <Check size={24} color={'white'} strokeWidth={2} />,
        onPress: () => {
          router.replace('/camera');
        },
      });
      setVisible(true);
      setMessage(`Stored at folder\n"${destFile.uri}"`);
    } catch (error) {
      console.error('Error saving photo:', error);
    }
  }, [setAction, uri]);

  const fetchCalendar = useCallback(async () => {
    setAction({
      icon: <ActivityIndicator size={'small'} color={'white'} className="p-0.5" />,
      onPress: () => {},
    });
    await new Promise((resolve) => {
      setTimeout(() => resolve('f'), 2000);
    });
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission missing in Preview Screen');
        return;
      }
      // 1. Lấy danh sách lịch đã chọn từ bộ nhớ
      const storedIds = await AsyncStorage.getItem('USER_CALENDAR_IDS');
      if (!storedIds) {
        return;
      }
      const calendarIds = JSON.parse(storedIds);
      // 2. Xác định thời gian bắt đầu và kết thúc của NGÀY ĐANG CHỌN
      console.log(calendarIds);
      const date = new Date();
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);
      console.log(date, startDate, endDate);
      // 3. Gọi API lấy sự kiện
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const fetchedEvents = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
      console.log(fetchedEvents);
      // 4. Sắp xếp theo giờ tăng dần
      // fetchedEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      // setEvents(fetchedEvents);
    } catch (error) {
      console.error('Lỗi lấy lịch:', error);
    } finally {
      setAction({
        icon: <Download size={24} color={'white'} strokeWidth={2} />,
        onPress: savePhoto,
      });
    }
  }, [setAction, savePhoto]);

  // const scale = useSharedValue(1);
  // const focalX = useSharedValue(0);
  // const focalY = useSharedValue(0);
  // const translateX = useSharedValue(0);
  // const translateY = useSharedValue(0);

  // const pinch = Gesture.Pinch().onUpdate((e) => {
  //   scale.value = e.scale;
  //   focalX.value = e.focalX;
  //   focalY.value = e.focalY;
  // });
  // .onEnd(() => {
  //   scale.value = withTiming(1, { duration: 300 });
  // });

  // const pan = Gesture.Pan().onChange((e) => {
  //   translateX.value = e.translationX;
  //   translateY.value = e.translationY;
  // });
  // .onEnd(() => {
  //   translateX.value = withTiming(0, { duration: 300 });
  //   translateY.value = withTiming(0, { duration: 300 });
  // });

  // const animatedStyle = useAnimatedStyle(() => ({
  //   transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  // }));

  useEffect(() => {
    fetchCalendar();
    return resetAction;
  }, [fetchCalendar, uri, resetAction]);

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss();
        setShowNote(false);
      }}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="flex-1">
          {/* Discard Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.replace('/camera')}
            className="absolute right-5 top-5 z-10 rounded-full border-3 bg-[#FFF8E3] p-1"
          >
            <X size={24} strokeWidth={3} color={'#714A36'} />
          </TouchableOpacity>
          {/* Image */}
          {sideWay.includes(rotation) ? (
            <Image resizeMode="center" source={{ uri }} className="flex-1 rounded-xl overflow-hidden" />
          ) : (
            <Image source={{ uri }} className="flex-1 rounded-xl overflow-hidden" />
          )}
          {/* Note Toggle */}
          <View className="absolute bottom-5 right-5 ">
            <TouchableOpacity
              onPress={() => setShowNote(!showNote)}
              activeOpacity={0.8}
              className="w-[60px] h-[60px] rounded-full flex items-center justify-center border border-primary"
              style={{ backgroundColor: showNote ? '#714A36' : '#FFF8E3' }}
            >
              {showNote ? <BookOpen size={24} color={'white'} /> : <BookText size={24} color={'#714E43'} />}
            </TouchableOpacity>
          </View>
          {/* Note Input */}
          {showNote && (
            <View className="absolute top-1/3 left-0 right-0 px-7">
              <View className="bg-[#FFF8E3] rounded-2xl border-primary border">
                {/* Header */}
                <View className="bg-[#714A36] py-1.5 rounded-xl -mt-4 mx-auto px-12 items-center">
                  <Text className="text-white text-center font-sen font-bold text-xl">Note</Text>
                </View>

                {/* Text area */}
                <ScrollView className="p-4 min-h-1/3">
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="Add a note for this photo..."
                    className="w-full min-h-40 text-sm text-[#555] font-sen bg-transparent border-0 mb-4"
                    multiline
                    autoFocus
                  />
                </ScrollView>
              </View>
            </View>
          )}
          {/* Noti */}
          <Alert
            message={message}
            visible={visible}
            onDismiss={() => {
              setVisible(false);
              router.replace('/camera');
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
