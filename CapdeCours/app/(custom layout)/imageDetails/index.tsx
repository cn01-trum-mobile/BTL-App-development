import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, Keyboard, ActivityIndicator, Alert } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { Trash2, Edit, Check, Plus, ChevronLeft, X, Folder, RotateCw } from 'lucide-react-native';
import BottomNav from '@/components/BottomNav';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler } from 'react-native-gesture-handler';
import { File, Directory, Paths } from 'expo-file-system';
import { format } from 'date-fns';
import FolderCard from '@/components/Folder';
import { clearFolderCache, updateCacheAfterMove, getPhotosFromCache, savePhotosToCache } from '@/utils/photoCache';
import PagerView from 'react-native-pager-view';

// --- INTERFACES ---
interface EditableFieldProps {
  label: string;
  initialValue: string;
  field: 'name' | 'note' | 'folder' | 'time';
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  onEditTrigger: (field: 'name' | 'note' | 'folder') => void;
  onSave: (field: 'name' | 'note', newValue: string) => void;
}

interface PhotoItemProps {
  uri: string;
  rotation?: number;
}

// --- Component Handle ---
const CustomHandle: React.FC<BottomSheetHandleProps> = () => (
  <View className="items-center -mt-5 pb-2">
    <View className="bg-[#6E4A3F] px-10 py-2 rounded-lg shadow-sm">
      <Text className="text-[#FFF8E3] font-bold text-lg">Details</Text>
    </View>
  </View>
);

// --- Component EditableField ---
const EditableField: React.FC<EditableFieldProps> = ({ label, initialValue, field, bottomSheetRef, onEditTrigger, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(initialValue);

  useEffect(() => {
    setCurrentValue(initialValue);
  }, [initialValue]);

  const handleToggleEdit = () => {
    if (field === 'folder') {
      onEditTrigger('folder');
      return;
    }
    if (!isEditing) {
      bottomSheetRef.current?.snapToIndex(4);
    }
    if (isEditing) {
      onSave(field as 'name' | 'note', currentValue);
      Keyboard.dismiss();
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const isNote = field === 'note';

  if (field === 'time') {
    return (
      <View className="mb-6 mx-3">
        <Text className="font-bold text-[#6E4A3F] mb-1">{label}</Text>
        <Text className="text-base font-semibold text-neutral-800 pt-1">{initialValue}</Text>
      </View>
    );
  }

  if (field === 'folder') {
    return (
      <View className="mb-6 mx-3">
        <Text className="text-[#6E4A3F] mb-1 font-bold">{label}</Text>
        <View className="flex-row justify-between items-center py-1">
          <Text className="text-base font-semibold text-neutral-800 flex-1 mr-2">
            {/* Hiển thị Folder hiện tại */}
            {currentValue}
          </Text>

          {/* NÚT BÚT CHÌ ĐỂ SỬA */}
          <TouchableOpacity onPress={() => onEditTrigger('folder')}>
            <Edit size={16} color="#888" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-6 mx-3">
      <Text className="font-bold text-[#6E4A3F] mb-1">{label}</Text>
      <View className="flex-row justify-between items-center py-1">
        {isEditing ? (
          <TextInput
            testID={field === 'note' ? 'note-input' : undefined}
            className={`text-neutral-800 border-b border-gray-300 flex-1 mr-2 px-0 ${isNote ? 'text-sm min-h-[100px] text-left' : 'font-bold text-base'}`}
            value={currentValue}
            onChangeText={setCurrentValue}
            autoFocus={true}
            multiline={isNote}
            style={{ textAlignVertical: isNote ? 'top' : 'center', maxHeight: 120 }}
            onBlur={() => {
              if (isEditing && !isNote) handleToggleEdit();
            }}
          />
        ) : (
          <Text className={`text-base text-neutral-800 ${isNote ? 'text-sm leading-5 mx-5 flex-1 mr-2' : 'font-semibold flex-1 mr-2'}`}>{currentValue}</Text>
        )}
        <TouchableOpacity testID={field === 'note' ? 'note-edit-toggle' : undefined} onPress={handleToggleEdit} className={isNote ? 'self-start' : ''}>
          {isEditing ? <Check size={18} color="#4CAF50" /> : <Edit size={16} color="#888" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const PhotoItem = React.memo(
  ({ uri, rotation = 0, scale, translateX, translateY, onDoubleTap, onGestureEvent, onHandlerStateChange }: PhotoItemProps & { 
    scale: number; 
    translateX: number;
    translateY: number;
    onDoubleTap: () => void;
    onGestureEvent: (event: any) => void;
    onHandlerStateChange: (event: any) => void;
  }) => (
    <PinchGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <View className="flex-1 bg-[#FFF8E3] justify-center items-center overflow-hidden">
        <TouchableOpacity 
          activeOpacity={1}
          onPress={onDoubleTap}
          className="flex-1 w-full justify-center items-center"
        >
          <Image 
            source={{ uri }} 
className="w-full h-full" 
            resizeMode="contain" 
            fadeDuration={0} 
            progressiveRenderingEnabled={true}
            style={{
              transform: [
                { translateX },
                { translateY },
                { rotate: `${rotation}deg` },
                { scale }
              ]
            }}
          />
        </TouchableOpacity>
      </View>
    </PinchGestureHandler>
  ),
  (prevProps, nextProps) => {
    return prevProps.uri === nextProps.uri && 
           prevProps.rotation === nextProps.rotation &&
           prevProps.scale === nextProps.scale &&
           prevProps.translateX === nextProps.translateX &&
           prevProps.translateY === nextProps.translateY;
  }
);

// Đặt tên cho component để dễ debug
PhotoItem.displayName = 'PhotoItem';

// --- MAIN SCREEN ---
export default function DetailView() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['11%', '25%', '50%', '90%'], []);

const [loading, setLoading] = useState(true);

  // VIEW MODES: 'details' -> 'folder_selection' -> 'session_selection'
  const [viewMode, setViewMode] = useState<'details' | 'folder_selection' | 'session_selection'>('details');
  const [photos, setPhotos] = useState<string[]>([]);
const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  // Thêm useEffect này sau snapPoints
  useEffect(() => {
    if (viewMode === 'details') {
      bottomSheetRef.current?.snapToIndex(4); // Hoặc 2 để cao hơn
    } else if (viewMode === 'folder_selection' || viewMode === 'session_selection') {
      // Delay nhẹ để đảm bảo component đã render xong
      setTimeout(() => {
        bottomSheetRef.current?.snapToIndex(4); // Luôn mở full khi chọn folder/session
      }, 50);
    }
  }, [viewMode]);

  // Data Logic
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [availableSessions, setAvailableSessions] = useState<string[]>([]); // List session của folder đang chọn

  // Temp Data khi đang chọn
  const [selectedTargetFolder, setSelectedTargetFolder] = useState('');

  // Input Create New
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    setIsCreating(false); // Tắt ô nhập liệu
    setNewItemName(''); // Xóa nội dung cũ đi cho sạch
  }, [viewMode]);

const [data, setData] = useState({
    name: '',
    folder: '',
    time: '',
    note: '',
    uri: '',
    jsonUri: '',
    rawTime: '',
    session: '',
    rotation: 0,
  });

  // State để lưu góc xoay cho từng ảnh
  const [photoRotations, setPhotoRotations] = useState<{[key: string]: number}>({});
  
  // State cho zoom
  const [scale, setScale] = useState(1);
  const [lastScale, setLastScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [lastTranslateX, setLastTranslateX] = useState(0);
  const [lastTranslateY, setLastTranslateY] = useState(0);

  // 1. LOAD DATA INITIAL
  useEffect(() => {
    const loadMetadata = async () => {
      if (!uri) return;
      try {
        const decodedUri = decodeURIComponent(uri);
const jsonPath = decodedUri.replace(/\.jpg$/i, '.json');
        const jsonFile = new File(jsonPath);

        let metadata = { name: '', folder: '', time: '', note: '', session: '', rotation: 0 };

        if (jsonFile.exists) {
          const content = await jsonFile.text();
          metadata = JSON.parse(content);
        } else {
          metadata.time = new Date().toISOString();
          metadata.name = 'Unknown';
        }

        let displayTime = metadata.time;
        try {
          displayTime = format(new Date(metadata.time), 'h:mma EEEE, MMM do yyyy');
        } catch {}

setData({
          name: metadata.name || 'Untitled',
          folder: metadata.folder || 'Unorganized',
          time: displayTime,
          note: metadata.note || '',
          uri: decodedUri,
          jsonUri: jsonPath,
          rawTime: metadata.time,
          session: metadata.session || format(new Date(), 'yyyy-MM-dd'),
          rotation: metadata.rotation || 0,
        });

        // Lưu góc xoay vào state photoRotations
        setPhotoRotations(prev => ({
          ...prev,
          [decodedUri]: metadata.rotation || 0
        }));
      } catch (error) {
        console.error('Error loading detail:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMetadata();
  }, [uri]);

  // --- LOGIC 1: LOAD FOLDERS ---
  const loadFolders = async () => {
    try {
      const photosDir = new Directory(Paths.document, 'photos');
      if (!photosDir.exists) return;
      const items = photosDir.list();
      const folders = items
        .filter((item) => item instanceof Directory)
        .map((dir) => dir.name)
        .sort();
      setAvailableFolders(folders);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Sửa useEffect loadAllPhotosInFolder để không gọi setLoading không cần thiết
  const loadAllPhotosInFolder = async (folderName?: string, currentUri?: string) => {
    try {
      // XÓA phần này: if (photos.length === 0) { setLoading(true); }

      // Sử dụng parameter hoặc fallback về data.folder/data.uri
      const targetFolder = folderName || data.folder;
      const targetUri = currentUri || data.uri;

      if (!targetFolder || !targetUri) {
        return;
      }

      const photosDir = new Directory(Paths.document, 'photos');
      const currentFolderDir = new Directory(photosDir, targetFolder);

      if (!currentFolderDir.exists) {
        setPhotos([targetUri]);
        return;
      }

      const files = currentFolderDir.list();
      const imageFiles = files.filter(
        (f): f is File =>
          f instanceof File && (f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg') || f.name.toLowerCase().endsWith('.png'))
      );

      const photosWithTime = await Promise.all(
        imageFiles.map(async (file) => {
          try {
            const jsonPath = file.uri.replace(/\.(jpg|jpeg|png)$/i, '.json');
            const jsonFile = new File(jsonPath);

            if (jsonFile.exists) {
              const content = await jsonFile.text();
              const metadata = JSON.parse(content);
              return {
                uri: file.uri,
                fileName: file.name,
                time: metadata.time || new Date().toISOString(),
                session: metadata.session || '',
              };
            }
            return {
              uri: file.uri,
              fileName: file.name,
              time: new Date().toISOString(),
              session: '',
            };
          } catch {
            return {
              uri: file.uri,
              fileName: file.name,
              time: new Date().toISOString(),
              session: '',
            };
          }
        })
      );

      photosWithTime.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      const sortedUris = photosWithTime.map((photo) => photo.uri);

      // Tìm ảnh hiện tại bằng cách so sánh URI hoặc tên file (để xử lý trường hợp đổi tên folder)
      const currentImageFile = new File(targetUri);
      const currentFileName = currentImageFile.name;
      const currentIndex = sortedUris.findIndex((uri) => {
        const file = new File(uri);
        // So sánh bằng URI hoặc tên file
        return uri === targetUri || file.name === currentFileName;
      });
      const newIndex = currentIndex >= 0 ? currentIndex : 0;
      setCurrentPhotoIndex(newIndex);
      setPhotos(sortedUris);

      // Cập nhật PagerView index nếu cần
      if (pagerRef.current && newIndex !== currentPhotoIndex) {
        setTimeout(() => {
          pagerRef.current?.setPage(newIndex);
        }, 100);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      setPhotos([data.uri]);
    }
  };

  const loadPhotoMetadata = useCallback(
    async (photoUri: string) => {
try {

        const jsonPath = photoUri.replace(/\.(jpg|jpeg|png)$/i, '.json');
        const jsonFile = new File(jsonPath);

        let metadata = { name: '', folder: '', time: '', note: '', session: '', rotation: 0 };

        if (jsonFile.exists) {
          const content = await jsonFile.text();
          metadata = JSON.parse(content);
        }

        let displayTime = metadata.time;
        try {
          displayTime = format(new Date(metadata.time), 'h:mma EEEE, MMM do yyyy');
        } catch {}

setData((prev) => {
          const newData = {
            name: metadata.name || 'Untitled',
            folder: metadata.folder || 'Unorganized',
            time: displayTime,
            note: metadata.note || '',
            uri: photoUri,
            jsonUri: jsonPath,
            rawTime: metadata.time,
            session: metadata.session || format(new Date(), 'yyyy-MM-dd'),
            rotation: metadata.rotation || 0,
          };

if (
            prev.name === newData.name &&
            prev.folder === newData.folder &&
            prev.time === newData.time &&
            prev.note === newData.note &&
            prev.uri === newData.uri &&
            prev.session === newData.session &&
            prev.rotation === newData.rotation
          ) {
            return prev;
          }

        // Cập nhật photoRotations
        setPhotoRotations(prev => ({
          ...prev,
          [photoUri]: metadata.rotation || 0
        }));
          return newData;
        });
      } catch (error) {
        console.error('Error loading photo metadata:', error);
}
    },
    []
  );

  const isMovingRef = useRef(false);

  useEffect(() => {
    if (data.folder && data.uri && !isMovingRef.current) {
      // Truyền folder và uri hiện tại để tránh race condition
      loadAllPhotosInFolder(data.folder, data.uri);
    }
  }, [data.folder, data.uri, viewMode]);

  // --- LOGIC 2: LOAD SESSIONS CỦA MỘT FOLDER ---
  const loadSessionsForFolder = async (folderName: string) => {
    try {
      setLoading(true);
      const photosDir = new Directory(Paths.document, 'photos');
      const targetDir = new Directory(photosDir, folderName);

      if (!targetDir.exists) {
        setAvailableSessions([]);
        return;
      }

      const files = targetDir.list();
      const jsonFiles = files.filter((f): f is File => f instanceof File && f.name.endsWith('.json'));

      const sessionsSet = new Set<string>();

      // Đọc song song các file JSON để lấy session key
      await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const content = await file.text();
            const meta = JSON.parse(content);
            if (meta.session) sessionsSet.add(meta.session);
          } catch {}
        })
      );

      // Sắp xếp Session (Mới nhất lên đầu hoặc theo tên)
      const sortedSessions = Array.from(sessionsSet).sort().reverse();
      setAvailableSessions(sortedSessions);
    } catch (e) {
      console.error(e);
      setAvailableSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // A. Trigger mở màn hình chọn Folder
  const handleEditTrigger = async (field: 'name' | 'note' | 'folder') => {
    if (field === 'folder') {
      await loadFolders();
      setViewMode('folder_selection');
      bottomSheetRef.current?.snapToIndex(4);
    }
  };

  // B. Xử lý khi chọn 1 Folder -> Chuyển sang chọn Session
  const handleSelectFolder = async (folder: string) => {
    setSelectedTargetFolder(folder);
    await loadSessionsForFolder(folder);
    setViewMode('session_selection');
    setTimeout(() => {
      bottomSheetRef.current?.snapToIndex(4);
    }, 100);
  };

  // C. Xử lý khi chọn 1 Session -> Thực hiện Move
  const handleSelectSession = async (session: string) => {
    // Kiểm tra cả folder VÀ session để tránh báo lỗi sai
    if (selectedTargetFolder === data.folder && session === data.session) {
      setViewMode('details');
      requestAnimationFrame(() => {
        bottomSheetRef.current?.snapToIndex(4);
      });

      Alert.alert('No Change', 'This image is already in this folder and session.', [{ text: 'OK' }]);
      return;
    }
    await finalizeMove(selectedTargetFolder, session);
  };

  // D. Tạo Folder mới
  const handleCreateFolder = async () => {
    if (!newItemName.trim()) return;
    try {
      const photosDir = new Directory(Paths.document, 'photos');
      const newDir = new Directory(photosDir, newItemName.trim());
      if (!newDir.exists) {
        newDir.create();
        await loadFolders();
        setNewItemName('');
        setIsCreating(false);
      } else {
        Alert.alert('Lỗi', 'Folder này đã tồn tại.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // E. Tạo Session mới (Chỉ là string, không cần tạo thư mục vật lý)
  const handleCreateSession = async () => {
    if (!newItemName.trim()) return;
    // Chọn session mới vừa nhập và move luôn
    await finalizeMove(selectedTargetFolder, newItemName.trim());
    setNewItemName('');
    setIsCreating(false);
  };

  // F. HÀM CHÍNH: MOVE FILE & UPDATE JSON
  const finalizeMove = async (targetFolder: string, targetSession: string) => {
    try {
      // Kiểm tra xem có thay đổi gì không
      if (targetFolder === data.folder && targetSession === data.session) {
        setViewMode('details');
        requestAnimationFrame(() => {
          bottomSheetRef.current?.snapToIndex(3);
        });

        Alert.alert('No Change', 'The image is already in the selected folder and session.', [{ text: 'OK' }]);
        return;
      }

      setLoading(true);
      isMovingRef.current = true;

      // 1. Đường dẫn cũ
      const oldImageFile = new File(data.uri);
      const oldJsonFile = new File(data.jsonUri);
      const fileName = oldImageFile.name;
      const jsonName = oldJsonFile.name;

      // 2. Đường dẫn mới (Thư mục vật lý chỉ đến cấp Folder, Session nằm trong JSON)
      const destFolderDir = new Directory(new Directory(Paths.document, 'photos'), targetFolder);

      if (!destFolderDir.exists) destFolderDir.create();

      const newImageFile = new File(destFolderDir, fileName);
      const newJsonFile = new File(destFolderDir, jsonName);

      // 3. Move Files (Chỉ move nếu folder khác nhau)
      if (targetFolder !== data.folder) {
        if (oldImageFile.exists) await oldImageFile.move(newImageFile);
        if (oldJsonFile.exists) await oldJsonFile.move(newJsonFile);
      }

      // 4. Update JSON Metadata (Quan trọng nhất: Cập nhật Folder và Session)
      const targetJsonFile = targetFolder !== data.folder ? newJsonFile : oldJsonFile;

      if (targetJsonFile.exists) {
        const content = await targetJsonFile.text();
        const metadata = JSON.parse(content);

        metadata.folder = targetFolder; // Update Folder
        metadata.session = targetSession; // Update Session

        await targetJsonFile.write(JSON.stringify(metadata, null, 2));
      }

      // 5. Update State UI
      setData((prev) => ({
        ...prev,
        folder: targetFolder,
        session: targetSession,
        uri: targetFolder !== data.folder ? newImageFile.uri : prev.uri,
        jsonUri: targetFolder !== data.folder ? newJsonFile.uri : prev.jsonUri,
      }));

      await updateCacheAfterMove(data.folder, targetFolder, data.uri, {
        uri: targetFolder !== data.folder ? newImageFile.uri : data.uri,
        session: targetSession,
        subject: targetFolder,
      });

      clearFolderCache(data.folder);
      clearFolderCache(targetFolder);

      // 6. Gọi loadAllPhotosInFolder với folder và uri mới TRƯỚC KHI reset flag
      // Để đảm bảo load đúng folder mới
      const newUri = targetFolder !== data.folder ? newImageFile.uri : data.uri;
      await loadAllPhotosInFolder(targetFolder, newUri);

      // 7. Reset flag sau khi đã load xong
      isMovingRef.current = false;

      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 2000);
      setViewMode('details');
      requestAnimationFrame(() => {
        bottomSheetRef.current?.snapToIndex(4);
      });
    } catch (e) {
      Alert.alert('Error', 'Could not move image.');
      console.error(e);
      isMovingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

// ROTATE IMAGE
  const handleRotate = async (direction: 'left' | 'right') => {
    try {
      const currentRotation = photoRotations[data.uri] || data.rotation || 0;
      const newRotation = direction === 'right' 
        ? (currentRotation + 90) % 360 
        : (currentRotation - 90 + 360) % 360;

      // Cập nhật state photoRotations
      setPhotoRotations(prev => ({
        ...prev,
        [data.uri]: newRotation
      }));

      // Cập nhật data state
      setData(prev => ({ ...prev, rotation: newRotation }));

      // Lưu vào JSON file
      const jsonFile = new File(data.jsonUri);
      let existingContent = {};
      if (jsonFile.exists) {
        const text = await jsonFile.text();
        existingContent = JSON.parse(text);
      }
      const newMetadata = { ...existingContent, rotation: newRotation };
      await jsonFile.write(JSON.stringify(newMetadata, null, 2));

      // Cập nhật cache
      try {
        const currentCache = await getPhotosFromCache(data.folder);
        if (currentCache) {
          const updatedCache = currentCache.map(photo => {
            if (photo.uri === data.uri) {
              return {
                ...photo,
                rotation: newRotation
              };
            }
            return photo;
          });
          
          await savePhotosToCache(data.folder, updatedCache);
        }
      } catch (cacheError) {
        console.error('Error updating cache:', cacheError);
      }
    } catch (error) {
      console.error('Error rotating image:', error);
      Alert.alert('Error', 'Could not rotate image.');
    }
  };

  // SAVE DATA (Name, Note)
  const handleSave = async (field: 'name' | 'note', newValue: string) => {
    try {
      setData((prev) => ({ ...prev, [field]: newValue }));
      const jsonFile = new File(data.jsonUri);
      let existingContent = {};
      if (jsonFile.exists) {
        const text = await jsonFile.text();
        existingContent = JSON.parse(text);
      }
      const newMetadata = { ...existingContent, [field]: newValue };
      await jsonFile.write(JSON.stringify(newMetadata, null, 2));

      // === CẬP NHẬT CACHE ===
      if (field === 'note') {
        try {
          const currentCache = await getPhotosFromCache(data.folder);
          if (currentCache) {
            const updatedCache = currentCache.map((photo) => {
              if (photo.uri === data.uri) {
                return {
                  ...photo,
                  note: newValue,
                };
              }
              return photo;
            });

            await savePhotosToCache(data.folder, updatedCache);
            console.log('Cache updated after note edit');
          }
        } catch (cacheError) {
          console.error('Error updating cache:', cacheError);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not save changes.');
      console.error(error);
    }
  };

  const handleDelete = () => {
    Alert.alert('Image Deletion', 'Do you want to delete this image? This action cannot be undone.', [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
try {

            // 1. Xóa file ảnh
            const imageFile = new File(data.uri);
            if (imageFile.exists) {
              await imageFile.delete();
            }

            // 2. Xóa file json metadata
            const jsonFile = new File(data.jsonUri);
            if (jsonFile.exists) {
              await jsonFile.delete();
            }

            // 3. Cập nhật danh sách ảnh
            const newPhotos = photos.filter((uri) => uri !== data.uri);
            setPhotos(newPhotos);

            // 4. Nếu còn ảnh, chuyển đến ảnh trước đó
            if (newPhotos.length > 0) {
              const newIndex = Math.max(0, currentPhotoIndex - 1);
              setCurrentPhotoIndex(newIndex);
              // Cập nhật PagerView ngay lập tức
              if (pagerRef.current) {
                pagerRef.current.setPage(newIndex);
              }
              await loadPhotoMetadata(newPhotos[newIndex]);
            } else {
              // Nếu không còn ảnh nào, quay về
              clearFolderCache(data.folder);
              router.back();
              return;
            }

clearFolderCache(data.folder);
            } catch (error) {
              console.error('Lỗi xóa file:', error);
              Alert.alert('Error', 'Could not delete the image.');
            }
        },
      },
    ]);
  };

const handleScrollBeginDrag = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  // Zoom handlers
  const handlePinchGestureEvent = useCallback((event: any) => {
    const newScale = event.nativeEvent.scale * lastScale;
    
    // Calculate focal point translation
    const { focalX, focalY } = event.nativeEvent;
    const containerWidth = 400; // Approximate container width, you can make this dynamic
    const containerHeight = 600; // Approximate container height, you can make this dynamic
    
    // Calculate the offset from center
    const offsetX = (focalX - containerWidth / 2) / lastScale;
    const offsetY = (focalY - containerHeight / 2) / lastScale;
    
    // Calculate new translate values to keep focal point at same position
    const newTranslateX = lastTranslateX - (offsetX * (event.nativeEvent.scale - 1));
    const newTranslateY = lastTranslateY - (offsetY * (event.nativeEvent.scale - 1));
    
    setScale(newScale);
    setTranslateX(newTranslateX);
    setTranslateY(newTranslateY);
  }, [lastScale, lastTranslateX, lastTranslateY]);

  const handlePinchHandlerStateChange = useCallback((event: any) => {
    if (event.nativeEvent.state === 5) { // END
      setLastScale(scale);
      setLastTranslateX(translateX);
      setLastTranslateY(translateY);
    }
  }, [scale, translateX, translateY]);

  const handleDoubleTap = useCallback(() => {
    const newScale = scale === 1 ? 2 : 1;
    setScale(newScale);
    setLastScale(newScale);
    
    // Reset translation when returning to normal scale
    if (newScale === 1) {
      setTranslateX(0);
      setTranslateY(0);
      setLastTranslateX(0);
      setLastTranslateY(0);
    }
  }, [scale]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#6E4A3F" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-gray-100">


        {/* <View className="h-full relative">
          <Image source={{ uri: data.uri }} className="w-full h-full" resizeMode="cover" />
          
<TouchableOpacity onPress={() => router.back()} className="absolute top-12 left-4 p-2 bg-[#714A36]/20 rounded-full">
            <Text className="text-[#FFF8E3] text-xl font-bold">←</Text>
          </TouchableOpacity>

          
          <TouchableOpacity onPress={handleDelete} className="absolute top-12 right-4 p-2 bg-[#714A36]/20 rounded-full">
            <Trash2 size={22} color="#FFF8E3" />
          </TouchableOpacity>
        </View> */}

        <View className="flex-1 bg-black">
          {photos.length > 0 ? (
            <>
              <PagerView
                ref={pagerRef}
                key={`pager-${data.folder}-${photos.length}`}
                style={{ flex: 1 }}
                initialPage={currentPhotoIndex}
onPageSelected={(e) => {
                  const index = e.nativeEvent.position;
                  if (index >= 0 && index < photos.length) {
                    setCurrentPhotoIndex(index);
                    const newUri = photos[index];
                    
                     // Reset zoom khi chuyển ảnh
                     setScale(1);
                     setLastScale(1);
                     setTranslateX(0);
                     setTranslateY(0);
                     setLastTranslateX(0);
                     setLastTranslateY(0);
                    
                    if (newUri && newUri !== data.uri) {
                      loadPhotoMetadata(newUri);
                    }
                  }
                }}
                scrollEnabled={true}
              >
{photos.map((photoUri, index) => (
                  <View 
                    key={`photo-${index}-${photoUri.split('/').pop()}`}
                    style={{ flex: 1 }}
                  >
                    <PhotoItem 
                      uri={photoUri} 
                      rotation={photoRotations[photoUri] || 0}
                      scale={scale}
                      translateX={translateX}
                      translateY={translateY}
                      onDoubleTap={handleDoubleTap}
                      onGestureEvent={handlePinchGestureEvent}
                      onHandlerStateChange={handlePinchHandlerStateChange}
                    />
                  </View>
                ))}
              </PagerView>

              {/* Custom Pagination Dots */}
              {photos.length > 1 && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 100,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {photos.map((_, index) => (
                    <View
                      key={`dot-${index}`}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: index === currentPhotoIndex ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      }}
                    />
                  ))}
                </View>
              )}
            </>
) : (
            <View className="flex-1">
              <PhotoItem 
                uri={data.uri} 
                rotation={photoRotations[data.uri] || data.rotation || 0}
                scale={scale}
                translateX={translateX}
                translateY={translateY}
                onDoubleTap={handleDoubleTap}
                onGestureEvent={handlePinchGestureEvent}
                onHandlerStateChange={handlePinchHandlerStateChange}
              />
            </View>
          )}

{/* Header với các button */}
          <View className="absolute top-12 left-0 right-0 px-6 flex-row justify-between items-center z-10">
            {/* Back Button */}
            <TouchableOpacity 
              testID="header-back-button"
              onPress={() => router.back()} 
              className="w-10 h-10 bg-[#714A36]/50 rounded-full items-center justify-center"
            >
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>

            {/* Counter hiển thị số thứ tự ảnh */}
            {photos.length > 1 && (
              <View className="absolute left-0 right-0 items-center">
<View className="bg-[#714A36]/50 px-4 py-2 rounded-full">
                  <Text className="text-[#FFF8E3] text-sm font-semibold">
                    {currentPhotoIndex + 1}/{photos.length}
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-2">
              {/* Rotate Button */}
              <TouchableOpacity 
                onPress={() => handleRotate('right')}
                className="w-10 h-10 bg-[#714A36]/50 rounded-full items-center justify-center"
              >
                <RotateCw size={20} color="white" />
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity 
                testID="header-delete-button"
                onPress={handleDelete} 
                className="w-10 h-10 bg-[#714A36]/50 rounded-full items-center justify-center"
              >
                <Trash2 size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {showSuccessPopup && (
          <View className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center z-50 pointer-events-none">
            <View className="bg-[#8B4513] px-6 py-4 rounded-2xl items-center shadow-lg mx-4">
              <View className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center mb-2">
                <Check size={24} color="white" />
              </View>
<Text className="text-[#35383E] text-center font-bold">Stored at folder</Text>
              <Text className="text-[#35383E] text-center font-bold">&quot;{data.session}&quot;</Text>
            </View>
          </View>
        )}

        <BottomSheet
          ref={bottomSheetRef}
          index={1}
          snapPoints={snapPoints}
          backgroundStyle={{ backgroundColor: '#FFFBEE', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(113, 78, 67, 0.2)' }}
          handleComponent={CustomHandle}
          handleIndicatorStyle={{ opacity: 0 }}
          keyboardBehavior="interactive"
          android_keyboardInputMode="adjustResize"
          enableOverDrag={false}
          enablePanDownToClose={false}
          enableContentPanningGesture={true}
          enableHandlePanningGesture={true}
          activeOffsetY={[-1, 1]}
          failOffsetX={[-200, 200]}
        >
          <BottomSheetScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 100, flexGrow: 1 }}
            onScrollBeginDrag={handleScrollBeginDrag}
          >
            {/* 1. VIEW MODE: DETAILS */}
            {viewMode === 'details' && (
              <>
                <EditableField
                  label="Name"
                  initialValue={data.name}
                  field="name"
                  bottomSheetRef={bottomSheetRef}
                  onEditTrigger={handleEditTrigger}
                  onSave={handleSave}
                />

                {/* Hiển thị Folder*/}
                <EditableField
                  label="Folder"
                  initialValue={`${data.folder} / ${data.session}`}
                  field="folder"
                  bottomSheetRef={bottomSheetRef}
                  onEditTrigger={handleEditTrigger}
                  onSave={handleSave}
                />

                <EditableField
                  label="Time"
                  initialValue={data.time}
                  field="time"
                  bottomSheetRef={bottomSheetRef}
                  onEditTrigger={handleEditTrigger}
                  onSave={handleSave}
                />
                <EditableField
                  label="Note"
                  initialValue={data.note}
                  field="note"
                  bottomSheetRef={bottomSheetRef}
                  onEditTrigger={handleEditTrigger}
                  onSave={handleSave}
                />
              </>
            )}

            {/* 2. VIEW MODE: FOLDER SELECTION */}
            {viewMode === 'folder_selection' && (
              <View className="flex-1">
                {/* Header */}
                <View className="flex-row items-center gap-4 mb-5">
                  <TouchableOpacity
                    onPress={() => setViewMode('details')}
                    className="w-[35px] h-[35px] rounded-[11.25px] bg-[#F2F2F2] flex items-center justify-center"
                  >
                    <ChevronLeft size={24} color="#35383E" />
                  </TouchableOpacity>
                  <View className="flex-1">
                    <Text className="text-sm font-sen font-bold uppercase text-[#35383E] tracking-widest">CHOOSE FOLDER</Text>
                    <View className="w-full h-1 bg-[#8D7162]/50 rounded-full mt-1"></View>
                  </View>
                </View>

                {isCreating && (
                  <View className="mb-4">
                    <View className="flex-row items-center bg-white rounded-[20px] px-4 py-3 shadow-sm border border-gray-200">
                      <TextInput
                        value={newItemName}
                        onChangeText={setNewItemName}
                        placeholder="FOLDER NAME..."
                        placeholderTextColor="#9CA3AF"
                        autoFocus
                        onSubmitEditing={handleCreateFolder}
                        returnKeyType="done"
                        className="flex-1 text-[#35383E] font-bold text-base mr-2"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity onPress={() => setIsCreating(false)} className="bg-[#E0E0E0] p-1.5 rounded-full">
                        <X size={18} color="#757575" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View className="gap-y-1">
                  {availableFolders.map((folder) => {
                    const currentFolderRaw = data.folder || '';
                    const isCurrent = currentFolderRaw.trim().toLowerCase() === folder.trim().toLowerCase();
                    const backgroundColor = isCurrent ? '#6E4A3F' : '#FFD9B3';
                    const textColor = isCurrent ? 'text-white' : 'text-[#35383E]';

                    return (
                      // <TouchableOpacity
                      //   key={folder}
                      //   onPress={() => handleSelectFolder(folder)}
                      //   activeOpacity={0.9}
                      //   className="flex-row items-center gap-4 p-4 rounded-[22.5px] h-[65px] mb-3"
                      //   style={{ backgroundColor }}
                      // >
                      //   {/* Icon thư mục thay vì bút chì */}
                      //   <View
                      //     className={`flex items-center justify-center w-[35px] h-[35px] rounded-[11.25px] ${
                      //       isCurrent ? 'bg-white/20' : 'bg-black/10'
                      //     }`}
                      //   >
                      //     <Folder size={16} color={isCurrent ? 'white' : '#35383E'} />
                      //   </View>

                      //   {/* Title - không uppercase */}
                      //   <Text className={`flex-1 font-sen font-bold text-sm ${textColor}`}>
                      //     {folder}
                      //   </Text>

                      //   {/* Icon check nếu là folder hiện tại */}
                      //   {isCurrent && (
                      //     <View className="bg-white/20 rounded-full p-1">
                      //       <Check size={16} color="white" />
                      //     </View>
                      //   )}
                      // </TouchableOpacity>
                      <FolderCard
                        key={folder}
                        title={folder}
                        onPress={() => handleSelectFolder(folder)}
                        isActive={isCurrent}
                        icon={<Folder size={16} color={isCurrent ? 'white' : '#35383E'} />}
                        rightIcon={
                          isCurrent ? (
                            <View className="bg-white/20 rounded-full p-1">
                              <Check size={16} color="white" />
                            </View>
                          ) : undefined
                        }
                        showActions={false}
                      />
                    );
                  })}
                </View>

                {/* Nút Floating Add Folder */}
                {!isCreating && (
                  <View className="mt-auto items-end pt-4">
                    <TouchableOpacity
                      onPress={() => setIsCreating(true)}
                      className="w-14 h-14 bg-[#FFDAB9] rounded-full flex items-center justify-center shadow-md border-2 border-white"
                    >
                      <Plus size={28} color="#8B4513" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* 3. VIEW MODE: SESSION SELECTION */}
            {viewMode === 'session_selection' && (
              <View className="flex-1">
                <View className="flex-row items-center gap-4 mb-5">
                  <TouchableOpacity
                    onPress={() => setViewMode('folder_selection')}
                    className="w-[35px] h-[35px] rounded-[11.25px] bg-[#F2F2F2] flex items-center justify-center"
                  >
                    <ChevronLeft size={24} color="#35383E" />
                  </TouchableOpacity>
                  <View>
                    <Text className="text-sm font-sen font-bold text-[#35383E]">CHOOSE SESSION</Text>
                    <View className="h-[2px] w-full bg-[#6E4A3F] mt-1 opacity-20" />
                  </View>
                </View>

                {isCreating && (
                  <View className="mb-4">
                    <View className="flex-row items-center bg-white rounded-[20px] px-4 py-3 shadow-sm border border-gray-200">
                      <TextInput
                        value={newItemName}
                        onChangeText={setNewItemName}
                        placeholder="SESSION NAME..."
                        placeholderTextColor="#9CA3AF"
                        autoFocus
                        onSubmitEditing={handleCreateSession}
                        returnKeyType="done"
                        className="flex-1 text-[#35383E] font-bold text-base mr-2 uppercase"
                      />
                      <TouchableOpacity onPress={() => setIsCreating(false)} className="bg-[#E0E0E0] p-1 rounded-full">
                        <X size={16} color="#757575" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View className="gap-y-3">
                  {availableSessions.map((session) => {
                    const isCurrent = session === data.session && selectedTargetFolder === data.folder;

                    return (
                      <TouchableOpacity
                        key={session}
                        onPress={() => handleSelectSession(session)}
                        className={`w-full flex-row items-center justify-between px-5 py-4 rounded-[20px] ${isCurrent ? 'bg-[#6E4A3F]' : 'bg-[#FFE4C4]'}`}
                      >
                        <Text className={`font-bold text-sm uppercase ${isCurrent ? 'text-white' : 'text-[#4B3B36]'}`}>
                          {session}
                          {isCurrent && ' (Current)'}
                        </Text>
                        {isCurrent ? (
                          <Check size={20} color="white" />
                        ) : (
                          <ChevronLeft size={20} color="#4B3B36" style={{ transform: [{ rotate: '180deg' }] }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {availableSessions.length === 0 && <Text className="text-gray-400 text-center italic mt-4">No sessions found in this folder.</Text>}
                </View>

                {/* Floating Add Session */}
                {!isCreating && (
                  <View className="mt-auto items-end pt-4">
                    <TouchableOpacity
                      onPress={() => {
                        if (!isCreating) {
                          setNewItemName(format(new Date(), 'yyyy-MM-dd'));
                        }
                        setIsCreating(true);
                      }}
                      className="w-14 h-14 bg-[#FFDAB9] rounded-full flex items-center justify-center shadow-md border-2 border-white"
                    >
                      <Plus size={28} color="#8B4513" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </BottomSheetScrollView>
        </BottomSheet>

        <View className="absolute bottom-0 left-0 right-0 h-[70px]">
          <BottomNav />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
