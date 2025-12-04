import React, { useRef, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ImageSourcePropType } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import { Trash2, Edit } from 'lucide-react-native'; 
import BottomNav from '@/components/BottomNav'; 
import { useLocalSearchParams } from 'expo-router';

// 1. ĐỊNH NGHĨA INTERFACE CHO PROPS
interface RowProps {
    label: string;
    value: string;
    field: string;
    onEdit: (field: string) => void;
}
// NoteRow không cần 'field' vì nó luôn là 'note', nhưng chúng ta vẫn có thể dùng interface này hoặc tạo một cái mới.

// --- Component cho mỗi dòng chi tiết (Name, Folder, Time) ---
// 2. GÁN KIỂU RowProps CHO PROPS CỦA DetailRow
const DetailRow: React.FC<RowProps> = ({ label, value, field, onEdit }) => (
  <View style={detailsStyles.fieldContainer}>
    <Text style={detailsStyles.fieldLabel}>{label}</Text>
    <View style={detailsStyles.fieldRow}>
      <Text style={detailsStyles.fieldValue}>{value}</Text>
      <TouchableOpacity onPress={() => onEdit(field)}>
        <Edit size={16} color="#888" />
      </TouchableOpacity>
    </View>
  </View>
);

// --- Component cho phần Note/Description đặc biệt ---
// 3. GÁN KIỂU CHO PROPS CỦA NoteRow
// (Chỉ cần label, value và onEdit. Có thể bỏ qua field nếu onEdit luôn gọi 'note')
interface NoteRowProps {
    label: string;
    value: string;
    onEdit: (field: string) => void;
}
const NoteRow: React.FC<NoteRowProps> = ({ label, value, onEdit }) => (
  <View style={detailsStyles.fieldContainer}>
    <Text style={detailsStyles.fieldLabel}>{label}</Text>
    <View style={detailsStyles.fieldRow}>
      <Text style={detailsStyles.description}>
        {value}
      </Text>
      <TouchableOpacity style={detailsStyles.editNoteButton} onPress={() => onEdit("note")}>
        <Edit size={16} color="#888" />
      </TouchableOpacity>
    </View>
  </View>
);


// PHẦN CÒN LẠI CỦA DETAILVIEW (Sử dụng code của bạn, chỉ thêm lại các imports đã bị thiếu)

export default function DetailView() {
  const { uri, name } = useLocalSearchParams<{ uri?: string; name?: string }>();
  const navigation = useNavigation();
  const bottomSheetRef = useRef<BottomSheet>(null); // Giữ lại <BottomSheet> nếu bạn đang dùng TSX

  // 3 trạng thái: chỉ hiện tên, nửa màn hình, full
  const snapPoints = useMemo(() => ['18%', '25%', '55%', '90%'], []);

  // Hàm xử lý khi nhấn chỉnh sửa
  const handleEdit = (field: string) => { // Định nghĩa kiểu string cho field
    console.log(`Editing ${field}...`);
    // Thêm logic chuyển sang màn hình chỉnh sửa hoặc mở modal
  };

  return (
    <View style={styles.container}>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        <Image
          source={{
            uri: uri||'https://api.builder.io/api/v1/image/assets/TEMP/1c0a75c64f0f74fa6bd461db0c9830f7fc8248db?width=750',
          }}
          style={styles.coverImage}
        />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          {/* Thay thế Text bằng Icon Back Arrow nếu bạn có */}
          <Text style={{ color: 'white', fontSize: 20 }}>←</Text> 
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton}>
          <Trash2 size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0} // mở ở trạng thái đầu (25%)
        snapPoints={snapPoints}
        backgroundStyle={detailsStyles.bottomSheetBackground} 
        handleIndicatorStyle={detailsStyles.bottomSheetHandleIndicator}
      >
        <BottomSheetScrollView contentContainerStyle={detailsStyles.contentContainer}>
          {/* Nội dung đã được chỉnh sửa để giống Detail 2 */}
          
          {/* Name/Title Field */}
          <DetailRow
            label="Name"
            value={name || "ComputerNetwork-Session1..."}
            field="name"
            onEdit={handleEdit}
          />

          {/* Folder Field */}
          <DetailRow
            label="Folder"
            value="ComputerScience/Session1"
            field="folder"
            onEdit={handleEdit}
          />

          {/* Time Field */}
          <DetailRow
            label="Time"
            value="7:00AM Mon, Jan 1st 2025"
            field="time"
            onEdit={handleEdit}
          />

          {/* Note Field (Description) */}
          <NoteRow
            label="Note"
            value="Melbourne based Illustrator & Designer Ken Taylor works primarily within the music industry and is predominantly well known for his striking rock posters. Ken started in Perth Western Australia doing posters and album artwork for local bands."
            onEdit={handleEdit}
          />
          
        </BottomSheetScrollView>
      </BottomSheet>
      
      {/* BottomNav được đặt bên ngoài BottomSheet để luôn hiển thị */}
      <View style={styles.fixedBottomNav}>
        <BottomNav />
      </View>
    </View>
  );
}


// --- STYLES CHUNG ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F1F4F9' 
  },
  coverContainer: { 
    height: '100%', 
    position: 'relative' 
  },
  coverImage: { 
    width: '100%', 
    height: '100%', 
    resizeMode: 'cover' 
  },
  backButton: { 
    position: 'absolute', 
    top: 40, 
    left: 16,
    padding: 8
  },
  deleteButton: { 
    position: 'absolute', 
    top: 40, 
    right: 16,
    padding: 8
  },
  fixedBottomNav: {
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0,
    height: 70 
  }
});

// --- STYLES DÀNH CHO BOTTOM SHEET ---
const detailsStyles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFEF8', 
    borderRadius: 20, 
  },
  bottomSheetHandleIndicator: {
    backgroundColor: '#ccc', 
    width: 40,
    marginTop: 8,
  },
  
  contentContainer: {
    paddingHorizontal: 24, 
    paddingTop: 8, 
    paddingBottom: 100, 
  },

  fieldContainer: {
    marginBottom: 24, 
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1, 
    marginRight: 10,
  },
  description: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    flex: 1,
    marginRight: 10,
  },
  editNoteButton: {
    alignSelf: 'flex-start', 
  },
});