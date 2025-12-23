import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, Keyboard, ActivityIndicator, Alert } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { Trash2, Edit, Check } from 'lucide-react-native';
import BottomNav from '@/components/BottomNav';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { File } from 'expo-file-system'; // Import FileSystem
import { format } from 'date-fns';
import { measure } from 'react-native-reanimated';

// --- INTERFACES ---
interface StaticRowProps {
  label: string;
  value: string;
}

interface EditableFieldProps {
  label: string;
  initialValue: string;
  field: 'name' | 'note' | 'folder' | 'time';
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  onEditTrigger: (field: 'name' | 'note' | 'folder') => void;
  onSave: (field: 'name' | 'note' | 'folder', newValue: string) => void;
}

// --- Component Handle tùy chỉnh ---
const CustomHandle: React.FC<BottomSheetHandleProps> = () => (
  <View className="items-center -mt-4">
    <View className="w-20 h-8 bg-[#714A36] rounded-md justify-center items-center">
      <Text className="text-white font-semibold">Detail</Text>
    </View>
  </View>
);

// --- Component StaticRow (Giữ nguyên) ---
const StaticRow: React.FC<StaticRowProps> = ({ label, value }) => (
  <View className="mb-6">
    <Text className="font-bold text-[#714A36] mb-1">{label}</Text>
    <Text className="text-base text-neutral-800 pt-1">{value}</Text>
  </View>
);

// --- Component EditableField (Giữ nguyên UI, chỉ sửa logic hiển thị) ---
const EditableField: React.FC<EditableFieldProps> = ({ label, initialValue, field, bottomSheetRef, onEditTrigger, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(initialValue);

  // Cập nhật currentValue khi initialValue thay đổi (quan trọng khi load data xong)
  useEffect(() => {
    setCurrentValue(initialValue);
  }, [initialValue]);

  const handleToggleEdit = () => {
    if (!isEditing) {
      bottomSheetRef.current?.snapToIndex(4); // Snap to highest point
    }

    if (field === 'folder') {
        // Folder phức tạp hơn (liên quan đến move file), ở đây chỉ hiển thị alert hoặc logic riêng
        Alert.alert("Thông báo", "Tính năng chuyển thư mục đang phát triển.");
        return;
    }

    if (isEditing) {
      // Khi bấm Save
      onSave(field as 'name' | 'note', currentValue); // Gọi hàm save ở cha
      Keyboard.dismiss();
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const isNote = field === 'note';

  if (field === 'time') {
    return <StaticRow label={label} value={initialValue} />;
  }

  // UI Folder
  if (field === 'folder') {
    return (
      <View className="mb-6">
        <Text className="text-[#714A36] mb-1 font-bold">{label}</Text>
        <View className="flex-row justify-between items-center py-1">
          <Text className="text-base text-neutral-800 flex-1 mr-2">{currentValue}</Text>
          <TouchableOpacity onPress={handleToggleEdit}>
            <Edit size={16} color="#888" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // UI Name / Note
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
            onBlur={() => { if (isEditing && !isNote) handleToggleEdit(); }} // Auto save on blur for name
          />
        ) : (
          <Text className={`text-base text-neutral-800 ${isNote ? 'text-sm leading-5 flex-1 mr-2' : 'flex-1 mr-2'}`}>
            {currentValue}
          </Text>
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
  const [data, setData] = useState({
    name: '',
    folder: '',
    time: '',
    note: '',
    uri: '',
    jsonUri: '', // Lưu đường dẫn file json để ghi đè
    session: ''
  });

  // 1. LOAD DATA TỪ FILE SYSTEM
  useEffect(() => {
    const loadMetadata = async () => {
      if (!uri) return;
      try {
        const decodedUri = decodeURIComponent(uri);
        const jsonPath = decodedUri.replace(/\.jpg$/i, '.json'); // Tìm file json tương ứng
        const jsonFile = new File(jsonPath);

        let metadata = { name: '', folder: '', time: '', note: '', session: '' };

        // Nếu file JSON tồn tại, đọc nó
        if (jsonFile.exists) {
            const content = await jsonFile.text();
            metadata = JSON.parse(content);
        } else {
            // Fallback nếu không có file json (trường hợp file cũ)
            // Parse từ tên file: Folder-Session-Timestamp.jpg
            // Logic này tùy thuộc vào bạn muốn fallback thế nào
            metadata.time = new Date().toISOString(); 
            metadata.name = "Unknown";
        }
        
        // Format hiển thị
        let displayTime = metadata.time;
        try {
            displayTime = format(new Date(metadata.time), "h:mma EEEE, MMM do yyyy");
        } catch {}

        setData({
            name: metadata.name || 'Untitled',
            folder: metadata.folder + "/" + metadata.session || 'Unorganized',
            time: displayTime, // Hiển thị đẹp
            note: metadata.note || '',
            uri: decodedUri,
            jsonUri: jsonPath,
            session: metadata.session
            // rawTime: metadata.time // Giữ lại time gốc để lưu lại nếu cần
        });

      } catch (error) {
        console.error("Error loading detail:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [uri]);

  // 2. SAVE DATA (GHI ĐÈ FILE JSON)
  const handleSave = async (field: 'name' | 'note' | 'folder', newValue: string) => {
    try {
        // Cập nhật State UI ngay lập tức cho mượt
        setData(prev => ({ ...prev, [field]: newValue }));

        // Chuẩn bị dữ liệu để ghi xuống file
        // Chúng ta cần đọc lại file cũ để giữ các trường không thay đổi (như session, time gốc)
        // hoặc dùng state hiện tại nếu state đã đủ thông tin.
        // Ở đây mình chọn cách: Merge newValue vào file JSON cũ
        const jsonFile = new File(data.jsonUri);
        
        let existingContent = {};
        if (jsonFile.exists) {
            const text = await jsonFile.text();
            existingContent = JSON.parse(text);
        }

        const newMetadata = {
            ...existingContent,
            [field]: newValue, // Ghi đè trường vừa sửa (name hoặc note)
        };

        // Ghi xuống file
        await jsonFile.write(JSON.stringify(newMetadata, null, 2));
        console.log("Saved successfully!");

    } catch (error) {
        Alert.alert("Lỗi", "Không thể lưu thay đổi.");
        console.error(error);
    }
  };

  const handleEditTrigger = () => {}; // Placeholder cho folder
  const handleScrollBeginDrag = useCallback(() => { Keyboard.dismiss(); }, []);

  if (loading) {
    return <View className="flex-1 justify-center items-center bg-gray-100"><ActivityIndicator size="large" color="#714A36"/></View>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-gray-100">
        {/* Cover Image */}
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

        {/* Bottom Sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          index={1} // Mở ở mức 25% ban đầu
          snapPoints={snapPoints}
          containerStyle={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          backgroundStyle={{ backgroundColor: '#FFFBEE', borderRadius: 20 }}
          handleComponent={CustomHandle}
          handleIndicatorStyle={{ opacity: 0 }}
          keyboardBehavior="interactive"
          android_keyboardInputMode="adjustResize"
        >
          <BottomSheetScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 }}
            onScrollBeginDrag={handleScrollBeginDrag}
          >
            {/* Name Field */}
            <EditableField 
                label="Name" 
                initialValue={data.name} 
                field="name" 
                bottomSheetRef={bottomSheetRef} 
                onEditTrigger={handleEditTrigger} 
                onSave={handleSave} 
            />

            {/* Folder Field */}
            <EditableField 
                label="Folder" 
                initialValue={data.folder} 
                field="folder" 
                bottomSheetRef={bottomSheetRef} 
                onEditTrigger={handleEditTrigger} 
                onSave={handleSave} 
            />

            {/* Time Field (Read only) */}
            <EditableField 
                label="Time" 
                initialValue={data.time} 
                field="time" 
                bottomSheetRef={bottomSheetRef} 
                onEditTrigger={handleEditTrigger} 
                onSave={handleSave} 
            />

            {/* Note Field */}
            <EditableField 
                label="Note" 
                initialValue={data.note} 
                field="note" 
                bottomSheetRef={bottomSheetRef} 
                onEditTrigger={handleEditTrigger} 
                onSave={handleSave} 
            />
          </BottomSheetScrollView>
        </BottomSheet>

        {/* BottomNav */}
        <View className="absolute bottom-0 left-0 right-0 h-[70px]">
          <BottomNav />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}