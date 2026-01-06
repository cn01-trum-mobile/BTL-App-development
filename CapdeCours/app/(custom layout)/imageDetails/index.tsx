import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, Keyboard, ActivityIndicator, Alert} from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { Trash2, Edit, Check, Plus, ChevronLeft, X, Layers, Pencil } from 'lucide-react-native';
import BottomNav from '@/components/BottomNav';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { File, Directory, Paths } from 'expo-file-system';
import { format } from 'date-fns';
import FolderCard from '@/components/Folder';
import { clearFolderCache, updateCacheAfterMove,  getPhotosFromCache, savePhotosToCache } from '@/utils/photoCache';
import Swiper from 'react-native-swiper';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');


// --- INTERFACES ---
interface EditableFieldProps {
  label: string;
  initialValue: string;
  field: 'name' | 'note' | 'folder' | 'time';
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  onEditTrigger: (field: 'name' | 'note' | 'folder') => void;
  onSave: (field: 'name' | 'note', newValue: string) => void;
}

// --- Component Handle ---
const CustomHandle: React.FC<BottomSheetHandleProps> = () => (
  <View className="items-center -mt-5 pb-2">
    <View className="bg-[#6E4A3F] px-10 py-2 rounded-lg shadow-sm">
      <Text className="text-white font-bold text-lg">Details</Text>
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
          <TouchableOpacity 
             onPress={() => onEditTrigger('folder')}
          >
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
        <TouchableOpacity onPress={handleToggleEdit} className={isNote ? 'self-start' : ''}>
          {isEditing ? <Check size={18} color="#4CAF50" /> : <Edit size={16} color="#888" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Thêm useEffect này sau snapPoints
  useEffect(() => {
    if (viewMode === 'details') {
      bottomSheetRef.current?.snapToIndex(1); // Hoặc 2 để cao hơn
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
  });

  // 1. LOAD DATA INITIAL
  useEffect(() => {
    const loadMetadata = async () => {
      if (!uri) return;
      try {
        const decodedUri = decodeURIComponent(uri);
        const jsonPath = decodedUri.replace(/\.jpg$/i, '.json');
        const jsonFile = new File(jsonPath);

        let metadata = { name: '', folder: '', time: '', note: '', session: '' };

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
        });
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

  const loadAllPhotosInFolder = async () => {
    try {
      if (photos.length === 0) {
        setLoading(true);
      }
      
      const photosDir = new Directory(Paths.document, 'photos');
      const currentFolderDir = new Directory(photosDir, data.folder);
      
      if (!currentFolderDir.exists) {
        setPhotos([data.uri]);
        setLoading(false);
        return;
      }
      
      const files = currentFolderDir.list();
      const imageFiles = files.filter((f): f is File => 
        f instanceof File && 
        (f.name.toLowerCase().endsWith('.jpg') || 
        f.name.toLowerCase().endsWith('.jpeg') ||
        f.name.toLowerCase().endsWith('.png'))
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
                time: metadata.time || new Date().toISOString(),
                session: metadata.session || ''
              };
            }
            return {
              uri: file.uri,
              time: new Date().toISOString(),
              session: ''
            };
          } catch {
            return {
              uri: file.uri,
              time: new Date().toISOString(),
              session: ''
            };
          }
        })
      );
      
      photosWithTime.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      
      const sortedUris = photosWithTime.map(photo => photo.uri);
      
      const currentIndex = sortedUris.findIndex(uri => uri === data.uri);
      setCurrentPhotoIndex(currentIndex >= 0 ? currentIndex : 0);
      setPhotos(sortedUris);
    } catch (error) {
      console.error('Error loading photos:', error);
      setPhotos([data.uri]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data.folder && data.uri) {
      loadAllPhotosInFolder();
    }
  }, [data.folder, data.uri]);


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
        return;
      }

      setLoading(true);

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

      await updateCacheAfterMove(
        data.folder,
        targetFolder,
        data.uri,
        {
          uri: targetFolder !== data.folder ? newImageFile.uri : data.uri,
          session: targetSession,
          subject: targetFolder
        }
      );

      clearFolderCache(data.folder);
      clearFolderCache(targetFolder);

      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 2000);
      setViewMode('details');
      requestAnimationFrame(() => {
        bottomSheetRef.current?.snapToIndex(3);
      });
    } catch (e) {
      Alert.alert('Error', 'Could not move image.');
      console.error(e);
    } finally {
      setLoading(false);
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
            const updatedCache = currentCache.map(photo => {
              if (photo.uri === data.uri) {
                return {
                  ...photo,
                  note: newValue
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
    Alert.alert(
      'Image Deletion',
      'Do you want to delete this image? This action cannot be undone.',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);

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
              const newPhotos = photos.filter(uri => uri !== data.uri);
              setPhotos(newPhotos);
              
              // 4. Nếu còn ảnh, chuyển đến ảnh trước đó
              if (newPhotos.length > 0) {
                const newIndex = Math.max(0, currentPhotoIndex - 1);
                setCurrentPhotoIndex(newIndex);
                await loadPhotoMetadata(newPhotos[newIndex]);
              } else {
                // Nếu không còn ảnh nào, quay về
                clearFolderCache(data.folder);
                router.back();
              }
              
              clearFolderCache(data.folder);
            } catch (error) {
              console.error('Lỗi xóa file:', error);
              Alert.alert('Error', 'Could not delete the image.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleScrollBeginDrag = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#6E4A3F" />
      </View>
    );
  }

  const loadPhotoMetadata = async (photoUri: string) => {
    try {
      setLoadingMetadata(true); 
      
      const jsonPath = photoUri.replace(/\.(jpg|jpeg|png)$/i, '.json');
      const jsonFile = new File(jsonPath);
      
      let metadata = { name: '', folder: '', time: '', note: '', session: '' };
      
      if (jsonFile.exists) {
        const content = await jsonFile.text();
        metadata = JSON.parse(content);
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
        uri: photoUri,
        jsonUri: jsonPath,
        rawTime: metadata.time,
        session: metadata.session || format(new Date(), 'yyyy-MM-dd'),
      });
    } catch (error) {
      console.error('Error loading photo metadata:', error);
    } finally {
      setLoadingMetadata(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-gray-100">

        
        {/* <View className="h-full relative">
          <Image source={{ uri: data.uri }} className="w-full h-full" resizeMode="cover" />
          
          <TouchableOpacity onPress={() => router.back()} className="absolute top-12 left-4 p-2 bg-black/20 rounded-full">
            <Text className="text-white text-xl font-bold">←</Text>
          </TouchableOpacity>

          
          <TouchableOpacity onPress={handleDelete} className="absolute top-12 right-4 p-2 bg-black/20 rounded-full">
            <Trash2 size={22} color="white" />
          </TouchableOpacity>
        </View> */}

        <View className="h-full relative">
          {/* Thay Image bằng Swiper */}
          {photos.length > 0 ? (
            <Swiper
              index={currentPhotoIndex}
              loop={false}
              showsPagination={true}
              paginationStyle={{ bottom: 20 }}
              dotColor="rgba(255,255,255,0.3)"
              activeDotColor="#FFFFFF"
              onIndexChanged={(index) => {
                setCurrentPhotoIndex(index);
                // Cập nhật data với ảnh hiện tại
                if (photos[index] !== data.uri) {
                  const newUri = photos[index];
                  // Load metadata của ảnh mới
                  loadPhotoMetadata(newUri);
                }
              }}
            >
              {photos.map((photoUri, index) => (
                <View key={index} className="flex-1 justify-center bg-black">
                  <Image 
                    source={{ uri: photoUri }} 
                    className="w-full h-full" 
                    resizeMode="contain"
                  />
                </View>
              ))}
            </Swiper>
          ) : (
            <Image source={{ uri: data.uri }} className="w-full h-full" resizeMode="cover" />
          )}
          
          {/* Back Button */}
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="absolute top-12 left-4 p-2 bg-black/50 rounded-full"
          >
            <Text className="text-white text-xl font-bold">←</Text>
          </TouchableOpacity>

          {/* Delete Button - chỉ hiển thị khi không có Swiper hoặc ở ảnh đầu */}
          <TouchableOpacity 
            onPress={handleDelete} 
            className="absolute top-12 right-4 p-2 bg-black/50 rounded-full"
          >
            <Trash2 size={22} color="white" />
          </TouchableOpacity>
          
          {/* Counter hiển thị số thứ tự ảnh */}
          {photos.length > 1 && (
            <View className="absolute top-20 right-4 bg-black/50 px-3 py-1 rounded-full">
              <Text className="text-white text-sm font-semibold">
                {currentPhotoIndex + 1}/{photos.length}
              </Text>
            </View>
          )}
        </View>




        {showSuccessPopup && (
          <View className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center z-50 pointer-events-none">
            <View className="bg-[#8B4513] px-6 py-4 rounded-2xl items-center shadow-lg mx-4">
              <View className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center mb-2">
                <Check size={24} color="white" />
              </View>
              <Text className="text-white text-center font-bold">Stored at folder</Text>
              <Text className="text-white text-center font-bold">"{data.session}"</Text>
            </View>
          </View>
        )}

        <BottomSheet
          ref={bottomSheetRef}
          index={1}
          snapPoints={snapPoints}
          backgroundStyle={{ backgroundColor: '#FFFBEE', borderRadius: 20 }}
          handleComponent={CustomHandle}
          handleIndicatorStyle={{ opacity: 0 }}
          keyboardBehavior="interactive"
          android_keyboardInputMode="adjustResize"
          enableOverDrag={false}
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
                  <TouchableOpacity onPress={() => setViewMode('details')} 
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
                                className="flex-1 text-[#35383E] font-bold text-base mr-2 uppercase"
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
                    return (
                      <FolderCard
                        key={folder}
                        title={folder}
                        onPress={() => handleSelectFolder(folder)}
                        isActive={isCurrent}
                        rightIcon={isCurrent ? (<View className="bg-white/20 rounded-full p-1"><Check size={16} color="white" /></View>) : undefined}
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
                  <TouchableOpacity onPress={() => setViewMode('folder_selection')} className="w-[35px] h-[35px] rounded-[11.25px] bg-[#F2F2F2] flex items-center justify-center">
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
                  {availableSessions.map((session) => (
                    <TouchableOpacity
                      key={session}
                      onPress={() => handleSelectSession(session)}
                      className="w-full flex-row items-center justify-between px-5 py-4 rounded-[20px] bg-[#FFE4C4]"
                    >
                      <Text className="font-bold text-[#4B3B36] text-sm uppercase">{session}</Text>
                      <ChevronLeft size={20} color="#4B3B36" style={{ transform: [{ rotate: '180deg' }] }} />
                    </TouchableOpacity>
                  ))}
                   {availableSessions.length === 0 && (
                       <Text className="text-gray-400 text-center italic mt-4">No sessions found in this folder.</Text>
                   )}
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
