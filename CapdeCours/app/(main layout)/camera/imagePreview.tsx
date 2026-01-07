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

/* --- OLD CODE: Không dùng trực tiếp Calendar và AsyncStorage ở đây nữa --- */
// import * as Calendar from 'expo-calendar';
// import { getData } from '@/utils/asyncStorage';
/* ------------------------------------------------------------------------ */

// --- NEW CODE: Import Hook mới ---
import { useUnifiedCalendar } from '@/app/services/useUnifiedCalendar';
// ---------------------------------

import { endOfDay, format, isWithinInterval, startOfDay } from 'date-fns';

export default function ImagePreviewScreen() {
  const { uri, rotation } = useLocalSearchParams<{ uri: string; rotation: string }>();
  const { setAction, resetAction } = useBottomAction();
  const [visible, setVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const sideWay = ['1', '3', '2', '4'];

  /* --- OLD CODE: State cũ --- */
  // const [events, setEvents] = useState<Calendar.Event[]>([]);
  // const [isLoading, setIsLoading] = useState(true);
  /* -------------------------- */

  // --- NEW CODE: Sử dụng Hook (đổi tên biến loading -> isLoading để khớp logic dưới) ---
  const { events, loading: isLoading, loadEvents } = useUnifiedCalendar();
  // ------------------------------------------------------------------------------------

  const sanitizeFolderName = useCallback((name: string) => {
    return name.trim();
  }, []);

  const savePhoto = useCallback(() => {
    if (!uri) return;
    const now = new Date();
    const timestamp = now.getTime(); // Lấy timestamp (ms) để đảm bảo duy nhất

    // 1. XỬ LÝ FOLDER (Tên môn)
    // Logic này vẫn hoạt động tốt vì UnifiedEvent cũng có startDate/endDate/title giống Calendar.Event
    const currentEvent = events.find((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      return isWithinInterval(now, { start, end });
    });

    let folder = 'Unorganized';
    if (currentEvent) {
      folder = sanitizeFolderName(currentEvent.title);
    }

    // 2. XỬ LÝ SESSION (Ngày học)
    const session = format(now, 'yyyy-MM-dd');

    // 3. XỬ LÝ NAME (Tên file chuẩn)
    // Format: TenMon-2025-12-24-17033232323
    const name = `${folder}-${session}-${timestamp}`;

    // 4. XỬ LÝ TIME (Thời gian chụp readable)
    const time = now.toISOString();

    try {
      const photosDir = new Directory(Paths.document, 'photos');
      const subjectDir = new Directory(photosDir, folder);

      if (!photosDir.exists) photosDir.create();
      if (!subjectDir.exists) subjectDir.create();

      // Đặt tên file vật lý theo biến 'name'
      const fileName = `${name}.jpg`;
      const jsonName = `${name}.json`;

      const sourceFile = new File(uri);
      const destFile = new File(subjectDir, fileName);
      const jsonFile = new File(subjectDir, jsonName);

      // Copy ảnh
      if (!destFile.exists) {
        sourceFile.copy(destFile);
      }

      // Tạo Metadata
      const metadata = {
        name: name, // Format: Folder-Session-Timestamp
        folder: folder, // Tên môn
        session: session, // Ngày
        time: time, // Thời gian chụp (ISO)
        note: note, // Ghi chú
      };

      // Ghi file JSON
      jsonFile.write(JSON.stringify(metadata, null, 2));

      // UI Feedback
      setAction({
        icon: <Check size={24} color={'white'} strokeWidth={2} />,
        onPress: () => {
          router.replace('/camera');
        },
      });
      setVisible(true);
      // Thông báo cho người dùng biết đã lưu
      setMessage(`Saved: ${fileName}`);
    } catch (error) {
      console.error('Error saving photo:', error);
    }
  }, [setAction, uri, events, note, sanitizeFolderName]);

  /* --- OLD CODE: Hàm fetchCalendar thủ công --- */
  // const fetchCalendar = useCallback(async () => {
  //   setIsLoading(true);
  //   try {
  //     const storedIds = await getData('USER_CALENDAR_IDS');
  //     if (!storedIds) {
  //       return;
  //     }
  //     const calendarIds = JSON.parse(storedIds);
  //     const date = new Date();
  //     const startDate = startOfDay(date);
  //     const endDate = endOfDay(date);
  //     const fetchedEvents = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
  //     fetchedEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  //     setEvents(fetchedEvents);
  //   } catch (error) {
  //     console.error('Lỗi lấy lịch:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, []);
  /* ------------------------------------------- */

  // --- NEW CODE: UseEffect gọi Hook loadEvents ---
  useEffect(() => {
    // Tự động load lịch của ngày hiện tại khi component được mount
    const now = new Date();
    loadEvents(startOfDay(now), endOfDay(now));
  }, [loadEvents]);
  // -----------------------------------------------

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

  /* --- OLD CODE: useEffect cũ gọi fetchCalendar --- */
  // useEffect(() => {
  //   fetchCalendar();
  //   return resetAction;
  // }, [fetchCalendar, resetAction]);
  /* ------------------------------------------------ */

  // --- NEW CODE: useEffect mới để resetAction ---
  useEffect(() => {
    return resetAction;
  }, [resetAction]);
  // ----------------------------------------------

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
