import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, Keyboard, ActivityIndicator, Alert, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { Trash2, Edit, Check, Folder, Plus, ChevronLeft, X, Calendar, Layers } from 'lucide-react-native';
import BottomNav from '@/components/BottomNav';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { File, Directory, Paths } from 'expo-file-system';
import { format } from 'date-fns';
import { SearchBar } from '@/components/SearchBar';

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
  <View className="items-center -mt-4">
    <View className="w-20 h-8 bg-[#714A36] rounded-md justify-center items-center">
      <Text className="text-white font-semibold">Details</Text>
    </View>
  </View>
);

// --- Component EditableField ---
const EditableField: React.FC<EditableFieldProps> = ({ label, initialValue, field, bottomSheetRef, onEditTrigger, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(initialValue);

  useEffect(() => { setCurrentValue(initialValue); }, [initialValue]);

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
      <View className="mb-6">
        <Text className="font-bold text-[#714A36] mb-1">{label}</Text>
        <Text className="text-base text-neutral-800 pt-1">{initialValue}</Text>
      </View>
    );
  }

  if (field === 'folder') {
    return (
      <View className="mb-6">
        <Text className="text-[#714A36] mb-1 font-bold">{label}</Text>
        <View className="flex-row justify-between items-center py-1">
          <Text className="text-base text-neutral-800 flex-1 mr-2">{currentValue}</Text>
          <TouchableOpacity onPress={() => onEditTrigger('folder')}>
             <View className="bg-[#FFD9B3] p-1.5 rounded-lg">
                <Edit size={16} color="#714A36" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-6">
      <Text className="font-bold text-[#714A36] mb-1">{label}</Text>
      <View className="flex-row justify-between items-center py-1">
        {isEditing ? (
          <TextInput
            className={`text-neutral-800 border-b border-gray-300 flex-1 mr-2 px-0 ${isNote ? 'text-sm min-h-[100px] text-left' : 'font-bold text-base'}`}
            value={currentValue}
            onChangeText={setCurrentValue}
            autoFocus={true}
            multiline={isNote}
            style={{ textAlignVertical: isNote ? 'top' : 'center', maxHeight: 120 }}
            onBlur={() => { if (isEditing && !isNote) handleToggleEdit(); }}
          />
        ) : (
          <Text className={`text-base text-neutral-800 ${isNote ? 'text-sm leading-5 flex-1 mr-2' : 'flex-1 mr-2'}`}>{currentValue}</Text>
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
  
  // Data Logic
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [availableSessions, setAvailableSessions] = useState<string[]>([]); // List session của folder đang chọn
  
  // Temp Data khi đang chọn
  const [selectedTargetFolder, setSelectedTargetFolder] = useState(''); 
  
  // Input Create New
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [data, setData] = useState({
    name: '',
    folder: '',
    time: '',
    note: '',
    uri: '',
    jsonUri: '', 
    rawTime: '',
    session: ''
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
            metadata.name = "Unknown";
        }
        
        let displayTime = metadata.time;
        try { displayTime = format(new Date(metadata.time), "h:mma EEEE, MMM do yyyy"); } catch {}

        setData({
            name: metadata.name || 'Untitled',
            folder: metadata.folder || 'Unorganized',
            time: displayTime,
            note: metadata.note || '',
            uri: decodedUri,
            jsonUri: jsonPath,
            rawTime: metadata.time,
            session: metadata.session || format(new Date(), 'yyyy-MM-dd')
        });

      } catch (error) {
        console.error("Error loading detail:", error);
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
            .filter(item => item instanceof Directory)
            .map(dir => dir.name)
            .sort();
        setAvailableFolders(folders);
    } catch (e) { console.error(e); }
  };

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
          await Promise.all(jsonFiles.map(async (file) => {
              try {
                  const content = await file.text();
                  const meta = JSON.parse(content);
                  if (meta.session) sessionsSet.add(meta.session);
              } catch {}
          }));

          // Sắp xếp Session (Mới nhất lên đầu hoặc theo tên)
          const sortedSessions = Array.from(sessionsSet).sort().reverse();
          setAvailableSessions(sortedSessions);

      } catch (e) {
          console.error(e);
          setAvailableSessions([]);
      } finally {
          setLoading(false);
      }
  }

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
  }

  // C. Xử lý khi chọn 1 Session -> Thực hiện Move
  const handleSelectSession = async (session: string) => {
      await finalizeMove(selectedTargetFolder, session);
  }

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
              Alert.alert("Lỗi", "Folder này đã tồn tại.");
          }
      } catch (e) { console.error(e); }
  };

  // E. Tạo Session mới (Chỉ là string, không cần tạo thư mục vật lý)
  const handleCreateSession = async () => {
      if (!newItemName.trim()) return;
      // Chọn session mới vừa nhập và move luôn
      await finalizeMove(selectedTargetFolder, newItemName.trim());
      setNewItemName('');
      setIsCreating(false);
  }

  // F. HÀM CHÍNH: MOVE FILE & UPDATE JSON
  const finalizeMove = async (targetFolder: string, targetSession: string) => {
      try {
          // Kiểm tra xem có thay đổi gì không
          if (targetFolder === data.folder && targetSession === data.session) {
              setViewMode('details');
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
          const targetJsonFile = (targetFolder !== data.folder) ? newJsonFile : oldJsonFile;
          
          if (targetJsonFile.exists) {
              const content = await targetJsonFile.text();
              const metadata = JSON.parse(content);
              
              metadata.folder = targetFolder;   // Update Folder
              metadata.session = targetSession; // Update Session
              
              await targetJsonFile.write(JSON.stringify(metadata, null, 2));
          }

          // 5. Update State UI
          setData(prev => ({
              ...prev,
              folder: targetFolder,
              session: targetSession,
              uri: (targetFolder !== data.folder) ? newImageFile.uri : prev.uri,
              jsonUri: (targetFolder !== data.folder) ? newJsonFile.uri : prev.jsonUri
          }));

          // Alert.alert("Thành công", `Đã chuyển sang ${targetFolder} / ${targetSession}`);
          setViewMode('details');

      } catch (e) {
          Alert.alert("Lỗi", "Không thể chuyển.");
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  // SAVE DATA (Name, Note)
  const handleSave = async (field: 'name' | 'note', newValue: string) => {
    try {
        setData(prev => ({ ...prev, [field]: newValue }));
        const jsonFile = new File(data.jsonUri);
        let existingContent = {};
        if (jsonFile.exists) {
            const text = await jsonFile.text();
            existingContent = JSON.parse(text);
        }
        const newMetadata = { ...existingContent, [field]: newValue };
        await jsonFile.write(JSON.stringify(newMetadata, null, 2));
    } catch (error) { Alert.alert("Lỗi", "Không thể lưu thay đổi."); }
  };

  const handleScrollBeginDrag = useCallback(() => { Keyboard.dismiss(); }, []);

  if (loading) {
    return <View className="flex-1 justify-center items-center bg-gray-100"><ActivityIndicator size="large" color="#714A36"/></View>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-gray-100">
        <View className="h-full relative">
          <Image source={{ uri: data.uri }} className="w-full h-full" resizeMode="cover" />
          {/* Back Button */}
          <TouchableOpacity onPress={() => router.back()} className="absolute top-12 left-4 p-2 bg-black/20 rounded-full">
            <Text className="text-white text-xl font-bold">←</Text>
          </TouchableOpacity>

          {/* Delete Button (Logic xóa chưa có, chỉ để UI) */}
          <TouchableOpacity className="absolute top-12 right-4 p-2 bg-black/20 rounded-full">
            <Trash2 size={22} color="white" />
          </TouchableOpacity>
        </View>

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
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 100 }}
            onScrollBeginDrag={handleScrollBeginDrag}
          >
            {/* 1. VIEW MODE: DETAILS */}
            {viewMode === 'details' && (
              <>
                <EditableField label="Name" initialValue={data.name} field="name" bottomSheetRef={bottomSheetRef} onEditTrigger={handleEditTrigger} onSave={handleSave} />
                
                {/* Hiển thị Folder / Session */}
                <EditableField 
                    label="Folder / Session" 
                    initialValue={`${data.folder} / ${data.session}`} 
                    field="folder" 
                    bottomSheetRef={bottomSheetRef} 
                    onEditTrigger={handleEditTrigger} 
                    onSave={handleSave} 
                />
                
                <EditableField label="Time" initialValue={data.time} field="time" bottomSheetRef={bottomSheetRef} onEditTrigger={handleEditTrigger} onSave={handleSave} />
                <EditableField label="Note" initialValue={data.note} field="note" bottomSheetRef={bottomSheetRef} onEditTrigger={handleEditTrigger} onSave={handleSave} />
              </>
            )}

            {/* 2. VIEW MODE: FOLDER SELECTION */}
            {viewMode === 'folder_selection' && (
              <View>
                <View className="flex-row items-center gap-4 mb-5">
                    <TouchableOpacity onPress={() => setViewMode('details')} className="w-[35px] h-[35px] rounded-[11.25px] bg-[#F2F2F2] flex items-center justify-center">
                        <ChevronLeft size={24} color="#35383E" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-sm font-sen font-bold uppercase text-[#35383E]">CHOOSE FOLDER</Text>
                        <View className="w-full h-1 bg-[#8D7162]/50 rounded-full mt-1"></View>
                    </View>
                </View>
                <SearchBar />

                {!isCreating ? (
                    <TouchableOpacity onPress={() => setIsCreating(true)} className="flex-row items-center justify-center p-4 mb-4 bg-[#E0E0E0] rounded-2xl border-2 border-dashed border-gray-400">
                        <Plus size={20} color="#555" />
                        <Text className="font-bold text-gray-600 ml-2">CREATE NEW FOLDER</Text>
                    </TouchableOpacity>
                ) : (
                    <View className="mb-4 flex-row items-center gap-2">
                        <TextInput value={newItemName} onChangeText={setNewItemName} placeholder="Folder Name..." autoFocus className="flex-1 bg-white p-3 rounded-xl border border-[#714A36] text-[#714A36]" />
                        <TouchableOpacity onPress={handleCreateFolder} className="bg-[#714A36] p-3 rounded-xl"><Check size={24} color="white" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => setIsCreating(false)} className="bg-red-400 p-3 rounded-xl"><X size={24} color="white" /></TouchableOpacity>
                    </View>
                )}

                <View className="gap-y-3">
                  {availableFolders.map((folder) => (
                    <TouchableOpacity 
                        key={folder} 
                        onPress={() => handleSelectFolder(folder)} // Chọn folder xong chuyển qua chọn session
                        className={`flex-row items-center p-4 rounded-2xl ${data.folder === folder ? 'bg-[#714A36]' : 'bg-[#FFD9B3]'}`}
                    >
                        <View className={`p-2 rounded-full mr-3 ${data.folder === folder ? 'bg-white/20' : 'bg-white/50'}`}>
                            <Folder size={20} color={data.folder === folder ? 'white' : '#714A36'} />
                        </View>
                        <Text className={`font-bold text-base ${data.folder === folder ? 'text-white' : 'text-[#714A36]'}`}>{folder}</Text>
                        <View className="ml-auto"><ChevronLeft size={20} color={data.folder === folder ? 'white' : '#714A36'} style={{transform: [{rotate: '180deg'}]}} /></View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* 3. VIEW MODE: SESSION SELECTION */}
            {viewMode === 'session_selection' && (
              <View>
                 <View className="flex-row items-center gap-4 mb-5">
                    <TouchableOpacity onPress={() => setViewMode('folder_selection')} className="w-[35px] h-[35px] rounded-[11.25px] bg-[#F2F2F2] flex items-center justify-center">
                        <ChevronLeft size={24} color="#35383E" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-sm font-sen font-bold uppercase text-[#35383E]">CHOOSE SESSION</Text>
                        <Text className="text-xs text-gray-500">in folder "{selectedTargetFolder}"</Text>
                        <View className="w-full h-1 bg-[#8D7162]/50 rounded-full mt-1"></View>
                    </View>
                </View>

                {/* Create Session Input */}
                {!isCreating ? (
                     <TouchableOpacity 
                        onPress={() => {
                            setIsCreating(true);
                            setNewItemName(format(new Date(), 'yyyy-MM-dd')); // Mặc định là ngày hôm nay
                        }} 
                        className="flex-row items-center justify-center p-4 mb-4 bg-[#E0E0E0] rounded-2xl border-2 border-dashed border-gray-400"
                    >
                        <Plus size={20} color="#555" />
                        <Text className="font-bold text-gray-600 ml-2">CREATE NEW SESSION</Text>
                    </TouchableOpacity>
                ) : (
                    <View className="mb-4 flex-row items-center gap-2">
                        <TextInput 
                            value={newItemName} 
                            onChangeText={setNewItemName} 
                            placeholder="Session Name (e.g. 2025-01-01)" 
                            autoFocus 
                            className="flex-1 bg-white p-3 rounded-xl border border-[#714A36] text-[#714A36]" 
                        />
                        <TouchableOpacity onPress={handleCreateSession} className="bg-[#714A36] p-3 rounded-xl"><Check size={24} color="white" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => setIsCreating(false)} className="bg-red-400 p-3 rounded-xl"><X size={24} color="white" /></TouchableOpacity>
                    </View>
                )}
                
                <Text className="mb-2 font-bold text-gray-500 text-xs uppercase">Existing Sessions</Text>
                
                <View className="gap-y-3">
                   {availableSessions.length === 0 && (
                        <Text className="text-center text-gray-400 italic py-4">No existing sessions found in this folder.</Text>
                   )}
                  {availableSessions.map((session) => (
                    <TouchableOpacity 
                        key={session} 
                        onPress={() => handleSelectSession(session)} // Chọn xong là Move luôn
                        className={`flex-row items-center p-4 rounded-2xl ${data.session === session && data.folder === selectedTargetFolder ? 'bg-[#714A36]' : 'bg-[#FFD9B3]'}`}
                    >
                        <View className={`p-2 rounded-full mr-3 ${data.session === session ? 'bg-white/20' : 'bg-white/50'}`}>
                            <Layers size={20} color={data.session === session ? 'white' : '#714A36'} />
                        </View>
                        <Text className={`font-bold text-base ${data.session === session ? 'text-white' : 'text-[#714A36]'}`}>{session}</Text>
                        {data.session === session && data.folder === selectedTargetFolder && (
                             <View className="ml-auto"><Check size={20} color="white" /></View>
                        )}
                    </TouchableOpacity>
                  ))}
                </View>
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