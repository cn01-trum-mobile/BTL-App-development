import { useBottomAction } from '@/context/NavActionContext';
import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, Text, TextInput, ScrollView, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Dimensions } from 'react-native';
import { File, Paths, Directory } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { BookOpen, BookText, Check, Download, X, Image as ImageIcon } from 'lucide-react-native';
import { Alert } from '@/components/Alert';
// import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/* --- OLD CODE: Không dùng trực tiếp Calendar và AsyncStorage ở đây nữa --- */
// import * as Calendar from 'expo-calendar';
// import { getData } from '@/utils/asyncStorage';
/* ------------------------------------------------------------------------ */

// --- NEW CODE: Import Hook mới ---
import { useUnifiedCalendar } from '@/app/services/useUnifiedCalendar';
// ---------------------------------

import { endOfDay, format, isWithinInterval, startOfDay } from 'date-fns';
import { PhotoItem, addPhotoToCache } from '@/utils/photoCache';

export default function ImagePreviewScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const { setAction, resetAction } = useBottomAction();
  const [visible, setVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [showNote, setShowNote] = useState(false);
const [note, setNote] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isGallerySave, setIsGallerySave] = useState(false);
  // const screenHeight = Dimensions.get('window').height;

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

const saveToGallery = useCallback(async () => {
  if (!uri) return;

  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      setMessage('Gallery permission denied');
      setVisible(true);
      return;
    }

    const now = new Date();
    const currentEvent = events.find((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      return isWithinInterval(now, { start, end });
    });

    const folderName = currentEvent
      ? sanitizeFolderName(currentEvent.title)
      : 'Unorganized';

// Lưu thẳng vào gallery
    await MediaLibrary.saveToLibraryAsync(uri);
    
    setMessage('Photo saved to gallery');
    setVisible(true);
    
    // Reset lại sau 2 giây để tắt icon check, không quay về camera
    setTimeout(() => {
      resetAction();
    }, 2000);
  } catch (error) {
    console.error('Error saving to gallery:', error);
    setAction({
      icon: <X size={24} color={'white'} strokeWidth={2} />,
      onPress: () => {
        // Không làm gì, chỉ để tắt icon
      },
    });
    setMessage('Failed to save to gallery');
    setVisible(true);
  }
}, [uri, events, sanitizeFolderName]);


  const savePhoto = useCallback(async () => {
    if (!uri) return;
    const now = new Date();
    const timestamp = now.getTime(); // Lấy timestamp (ms) để đảm bảo duy nhất

    // Gi nguyên ảnh gốc, không xoay tự động
    let processedUri = uri;

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

      const sourceFile = new File(processedUri);
      const destFile = new File(subjectDir, fileName);
      const jsonFile = new File(subjectDir, jsonName);

      // Copy ảnh (đã xử lý rotation)
      sourceFile.copy(destFile);

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

      // Không tự lưu vào gallery nữa, chỉ lưu vào app storage

      const newPhotoItem: PhotoItem = {
        uri: destFile.uri,
        name: fileName,
        timestamp: timestamp,
        note: note,
        subject: folder,
        session: session,
      };

      await addPhotoToCache(folder, newPhotoItem);
      console.log('Photo saved and cached:', fileName, 'folder:', folder, 'session:', session);

// UI Feedback
      setAction({
        icon: <Check size={24} color={'white'} strokeWidth={2} />,
        onPress: () => {
          // Không làm gì cả để tránh double-click
        },
      });
      setVisible(true);
      // Thông báo cho người dùng biết đã lưu
      setMessage(`Saved: ${fileName}`);
      
      // Tự động quay về trang camera sau 1.5 giây để tránh double-click
      setTimeout(() => {
        router.replace('/camera');
        resetAction();
      }, 1500);
    } catch (error) {
      console.error('Error saving photo:', error);
      setAction({
        icon: <X size={24} color={'white'} strokeWidth={2} />,
        onPress: () => {},
      });
      setVisible(true);
      setMessage('Failed to save photo');
    }
  }, [setAction, uri, events, note, sanitizeFolderName, loadEvents]);

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
  }, []); // Bỏ loadEvents để tránh infinite loop
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

  // Keyboard height listener
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss();
        setShowNote(false);
      }}
    >
      <View style={{ flex: 1 }}>
        {/* Discard Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.replace('/camera')}
          className="absolute right-5 top-5 z-10 rounded-full border-3 bg-[#FFF8E3] p-1"
        >
          <X size={24} strokeWidth={3} color={'#714A36'} />
        </TouchableOpacity>
        {/* Image */}
        <Image source={{ uri }} className="flex-1 rounded-xl overflow-hidden" resizeMode="contain" />
        {/* Note Toggle */}
        <View className="absolute bottom-5 right-5">
          <TouchableOpacity
            onPress={() => setShowNote(!showNote)}
            activeOpacity={0.8}
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center border border-primary"
            style={{ backgroundColor: showNote ? '#714A36' : '#FFF8E3' }}
          >
            {showNote ? <BookOpen size={24} color={'white'} /> : <BookText size={24} color={'#714E43'} />}
          </TouchableOpacity>
        </View>

        {/* Gallery Save Button */}
        <View className="absolute bottom-5 left-5">
          <TouchableOpacity
            onPress={saveToGallery}
            activeOpacity={0.8}
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center border border-primary bg-[#FFF8E3]"
          >
            <ImageIcon size={24} color={'#714E43'} />
          </TouchableOpacity>
        </View>

        {/* Note Input */}
        {showNote && (
          <View className="absolute bottom-20 left-0 right-0 px-7" style={{ marginBottom: keyboardHeight > 0 ? keyboardHeight - 150 : 0 }}>
            <View className="bg-[#FFF8E3] rounded-2xl border-primary border max-h-96 relative">
              {/* Close button */}
              <TouchableOpacity
                onPress={() => setShowNote(false)}
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-[#714A36] items-center justify-center"
              >
                <Check size={14} color={'white'} strokeWidth={2} />
              </TouchableOpacity>

              {/* Header */}
              <View className="bg-[#714A36] py-1.5 rounded-xl -mt-4 mx-auto px-12 items-center">
                <Text className="text-white text-center font-sen font-bold text-xl">Note</Text>
              </View>

              {/* Text area */}
              <ScrollView className="p-4 max-h-80">
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a note for this photo..."
                  className="w-full min-h-32 text-sm text-[#555] font-sen bg-transparent border-0 mb-4"
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
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
