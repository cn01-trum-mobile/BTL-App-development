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
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns';

export default function ImagePreviewScreen() {
  const { uri, rotation } = useLocalSearchParams<{ uri: string; rotation: string }>();
  const { setAction, resetAction } = useBottomAction();
  const [visible, setVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const sideWay = ['1', '3', '2', '4'];
  const [events, setEvents] = useState<Calendar.Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sanitizeFolderName = useCallback((name: string) => {
    return name.trim();
  }, []);

  const savePhoto = useCallback(() => {
    if (!uri) return;
    const now = new Date();
    // Check if "now" is inside any of the event time slots
    const currentEvent = events.find((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      return isWithinInterval(now, { start, end });
    });

    let subjectName = 'Unorganized'; // Default if no class is happening
    let eventDetails = null;
    if (currentEvent) {
      subjectName = sanitizeFolderName(currentEvent.title);
      eventDetails = {
        id: currentEvent.id,
        title: currentEvent.title,
        calendarId: currentEvent.calendarId,
        location: currentEvent.location,
      };
    }
    try {
      const photosDir = new Directory(Paths.document, 'photos');
      const subjectDir = new Directory(photosDir, subjectName);
      // Create folder if it doesn't exist
      if (!photosDir.exists) {
        photosDir.create();
      }
      // Create folder if it doesn't exist
      if (!subjectDir.exists) {
        subjectDir.create();
      }

      // Define Files (Image & Metadata)
      const timestamp = now.getTime();
      const fileName = `IMG_${timestamp}.jpg`;
      const jsonName = `IMG_${timestamp}.json`;

      const sourceFile = new File(uri); // The temp photo
      const destFile = new File(subjectDir, fileName); // The permanent photo
      const jsonFile = new File(subjectDir, jsonName); // The note/metadata

      if (!destFile.exists) {
        sourceFile.copy(destFile);
      }
      // Save the Metadata (Note)
      const metadata = {
        originalUri: uri,
        createdAt: now.toISOString(),
        note: note,
        subject: subjectName,
        event: eventDetails,
      };

      // Write the JSON content
      jsonFile.write(JSON.stringify(metadata, null, 2));

      // Alert
      setAction({
        icon: <Check size={24} color={'white'} strokeWidth={2} />,
        onPress: () => {
          router.replace('/camera');
        },
      });
      setVisible(true);
      setMessage(`Saved to \n"${subjectName}"`);
    } catch (error) {
      console.error('Error saving photo:', error);
    }
  }, [setAction, uri, events, note, sanitizeFolderName]);

  // Fetch calendar
  const fetchCalendar = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedIds = await AsyncStorage.getItem('USER_CALENDAR_IDS');
      if (!storedIds) {
        return;
      }
      const calendarIds = JSON.parse(storedIds);
      const date = new Date();
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);
      const fetchedEvents = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
      fetchedEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Lỗi lấy lịch:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) {
      // Show Spinner
      setAction({
        icon: <ActivityIndicator size={'small'} color={'white'} className="p-0.5" />,
        onPress: () => {},
      });
    } else {
      setAction({
        icon: <Download size={24} color={'white'} strokeWidth={2} />,
        onPress: savePhoto,
      });
    }
  }, [isLoading, savePhoto, setAction]);
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
  }, [fetchCalendar, resetAction]);

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
