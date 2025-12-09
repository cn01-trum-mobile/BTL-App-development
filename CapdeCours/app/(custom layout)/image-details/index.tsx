import React, { useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import { Trash2, Edit, Check } from 'lucide-react-native';
import BottomNav from '@/components/BottomNav';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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

// --- Component cho các dòng chi tiết KHÔNG chỉnh sửa trực tiếp (Time) ---
const StaticRow: React.FC<StaticRowProps> = ({ label, value }) => (
  <View className="mb-6">
    <Text className="text-xs text-gray-500 mb-1">{label}</Text>
    <Text className="text-base font-bold text-neutral-800 pt-1">{value}</Text>
  </View>
);

// --- Component cho các dòng chi tiết CÓ thể chỉnh sửa (Name, Note, Folder) ---
const EditableField: React.FC<EditableFieldProps> = ({ label, initialValue, field,bottomSheetRef, onEditTrigger, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(initialValue);

  const handleToggleEdit = () => {

    if (!isEditing) {
    bottomSheetRef.current?.snapToIndex(4);
  }
    if (field === 'folder') {
      onEditTrigger('folder');
      return;
    }

    if (isEditing) {
      let valueToSave = currentValue.trim();

      if (field === 'name') {
        // Loại bỏ extension nếu người dùng tự nhập (tránh .jpg.jpg)
        valueToSave = valueToSave.replace(/\.(jpg|jpeg|png)$/i, '');

        // Thêm extension tự động khi lưu Name
        valueToSave += '.jpg';
      }

      onSave(field as 'name' | 'note' | 'folder', valueToSave);
      Keyboard.dismiss();
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const isNote = field === 'note';

  // Trường Time
  if (field === 'time') {
    return <StaticRow label={label} value={initialValue} />;
  }

  // Trường Folder
  if (field === 'folder') {
    return (
      <View className="mb-6">
        <Text className="text-xs text-gray-500 mb-1">{label}</Text>
        <View className="flex-row justify-between items-center py-1">
          <Text className="text-base font-bold text-neutral-800 flex-1 mr-2">{currentValue}</Text>
          <TouchableOpacity onPress={handleToggleEdit}>
            <Edit size={16} color="#888" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Trường Name/Note
  return (
    <View className="mb-6">
      <Text className="text-xs text-gray-500 mb-1">{label}</Text>
      <View className="flex-row justify-between items-center py-1">
        {isEditing ? (
          <TextInput
            className={`
                            text-neutral-800 border-b border-gray-300 flex-1 mr-2 px-0
                            ${isNote ? 'text-sm min-h-[100px] text-left' : 'font-bold text-base'}
                        `}
            value={currentValue}
            onChangeText={setCurrentValue}
            autoFocus={true}
            multiline={isNote}
            style={{
              textAlignVertical: isNote ? 'top' : 'center',
              maxHeight: 120,
              overflow: 'scroll',
            }}
            onBlur={() => {
              if (isEditing) handleToggleEdit();
            }}
          />
        ) : (
          <Text className={`text-base text-neutral-800 ${isNote ? 'text-sm leading-5 flex-1 mr-2' : 'font-bold flex-1 mr-2'}`}>
            {/* Hiển thị tên file kèm .jpg khi không chỉnh sửa */}
            {field === 'name' ? `${currentValue}.jpg` : currentValue}
          </Text>
        )}
        <TouchableOpacity onPress={handleToggleEdit} className={isNote ? 'self-start' : ''}>
          {isEditing ? <Check size={18} color="#4CAF50" /> : <Edit size={16} color="#888" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- DETAILVIEW CHÍNH ---
export default function DetailView() {
  const { uri, name } = useLocalSearchParams<{ uri?: string; name?: string }>();
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Sử dụng regex với $ để chỉ loại bỏ extension ở cuối chuỗi
  const initialName = (name || 'ComputerNetwork-Session1.jpg').replace(/\.(jpg|jpeg|png)$/i, '');

  const [data, setData] = useState({
    name: initialName, // Name: "ComputerNetwork-Session1" (Không có extension)
    folder: 'ComputerScience/Session1',
    time: '7:00AM Mon, Jan 1st 2025',
    note: 'Melbourne based Illustrator & Designer Ken Taylor works primarily within the music industry and is predominantly well known for his striking rock posters. Ken started in Perth Western Australia doing posters and album artwork for local bands. This note is very long, stretching down to show how the keyboard dismissal works when scrolling down the bottom sheet. We need enough text to overflow the initial sheet height.',
    imageUri: uri || 'https://api.builder.io/api/v1/image/assets/TEMP/1c0a75c64f0f74fa6bd461db0c9830f7fc8248db?width=750',
  });

  const snapPoints = useMemo(() => ['11%', '20%', '55%', '95%'], []);

  const handleEditTrigger = (field: 'name' | 'note' | 'folder') => {
    // Logic chuyển trang cho Folder
  };

  const handleSave = (field: 'name' | 'note' | 'folder', newValue: string) => {
    console.log(`Saving ${field}: ${newValue}`);

    if (field === 'name') {
      // Loại bỏ extension để lưu tên gốc vào state
      const nameWithoutExtension = newValue.replace(/\.(jpg|jpeg|png)$/i, '');
      setData((prev) => ({ ...prev, [field]: nameWithoutExtension }));
    } else {
      setData((prev) => ({ ...prev, [field]: newValue }));
    }
  };

  const handleScrollBeginDrag = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-gray-100">
        {/* Cover Image */}
        <View className="h-full relative">
          <Image source={{ uri: data.imageUri }} className="w-full h-full" resizeMode="cover" />

          <TouchableOpacity onPress={() => router.back()} className="absolute top-10 left-4 p-2">
            <Text className="text-white text-xl">←</Text>
          </TouchableOpacity>

          <TouchableOpacity className="absolute top-10 right-4 p-2">
            <Trash2 size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Bottom Sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          index={1}
          snapPoints={snapPoints}
          containerStyle={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          backgroundStyle={{ backgroundColor: '#FFFBEE', borderRadius: 20 }}
          // Sử dụng component handle tùy chỉnh
          handleComponent={CustomHandle}
          // Ẩn indicator mặc định
          handleIndicatorStyle={{ opacity: 0 }}
          // Khắc phục lỗi bàn phím
          keyboardBehavior="interactive"
        >
          <BottomSheetScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 100 }}
            // Ẩn bàn phím khi kéo sheet
            onScrollBeginDrag={handleScrollBeginDrag}
          >
            {/* Name Field */}
            <EditableField label="Name" initialValue={data.name} field="name" bottomSheetRef={bottomSheetRef} onEditTrigger={handleEditTrigger} onSave={handleSave} />

            {/* Folder Field */}
            <EditableField label="Folder" initialValue={data.folder} field="folder" bottomSheetRef={bottomSheetRef} onEditTrigger={handleEditTrigger} onSave={handleSave} />

            {/* Time Field */}
            <EditableField label="Time" initialValue={data.time} field="time" bottomSheetRef={bottomSheetRef} onEditTrigger={handleEditTrigger} onSave={handleSave} />

            {/* Note Field */}
            <EditableField label="Note" initialValue={data.note} field="note" bottomSheetRef={bottomSheetRef}  onEditTrigger={handleEditTrigger} onSave={handleSave} />
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
