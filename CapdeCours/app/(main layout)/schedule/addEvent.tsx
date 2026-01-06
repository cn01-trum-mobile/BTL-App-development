// app/(main layout)/schedule/addEvent.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, ChevronLeft } from 'lucide-react-native';
import { createEvent, updateEvent, deleteEvent } from '@/app/services/calendarActions';
import { UnifiedEvent } from '@/app/types/calendarTypes';

export default function AddEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Kiểm tra xem có phải đang EDIT không?
  const isEditing = params.mode === 'edit';
  const eventToEdit = params.event ? (JSON.parse(params.event as string) as UnifiedEvent) : null;

  // State Form
  const [title, setTitle] = useState(eventToEdit?.title || '');
  const [date, setDate] = useState(eventToEdit ? new Date(eventToEdit.startDate) : new Date());

  // Tách giờ bắt đầu và kết thúc riêng để dễ chỉnh (như design)
  const [startTime, setStartTime] = useState(eventToEdit ? new Date(eventToEdit.startDate) : new Date());
  const [endTime, setEndTime] = useState(eventToEdit ? new Date(eventToEdit.endDate) : new Date(new Date().setHours(new Date().getHours() + 1)));

  // State hiển thị Picker (cho Android)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please enter event name');
      return;
    }

    // Gộp Ngày + Giờ lại thành Date Object chuẩn
    const finalStartDate = new Date(date);
    finalStartDate.setHours(startTime.getHours(), startTime.getMinutes());

    const finalEndDate = new Date(date);
    finalEndDate.setHours(endTime.getHours(), endTime.getMinutes());

    if (finalEndDate < finalStartDate) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    try {
      if (isEditing && eventToEdit) {
        // --- LOGIC UPDATE ---
        await updateEvent(eventToEdit, {
          title,
          startDate: finalStartDate,
          endDate: finalEndDate,
        });
        Alert.alert('Updated', 'Event updated successfully');
      } else {
        // --- LOGIC CREATE ---
        await createEvent(
          {
            title,
            startDate: finalStartDate,
            endDate: finalEndDate,
          },
          'LOCAL'
        ); // Mặc định tạo vào Local
        Alert.alert('Success', 'Event added successfully');
      }
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!eventToEdit) return;
    Alert.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEvent(eventToEdit);
          router.back();
        },
      },
    ]);
  };

  // Helper render picker
  const renderDatePicker = (value: Date, show: boolean, setShow: (v: boolean) => void, onChange: (d: Date) => void, mode: 'date' | 'time') => {
    if (Platform.OS === 'android' && !show) return null;

    return (
      (show || Platform.OS === 'ios') && (
        <DateTimePicker
          value={value}
          mode={mode}
          display={Platform.OS === 'ios' ? 'default' : 'default'}
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) onChange(selectedDate);
          }}
          style={Platform.OS === 'ios' ? { marginLeft: 'auto' } : undefined}
        />
      )
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>{isEditing ? 'Edit event' : 'Add new event'}</Text>

        {/* --- FORM --- */}

        {/* Event Name */}
        <Text style={styles.label}>Event name</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Math, Physics..." />

        {/* Date */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.inputRow} onPress={() => setShowDatePicker(true)}>
          {Platform.OS === 'android' ? (
            <Text style={styles.inputText}>{format(date, 'dd/MM/yyyy')}</Text>
          ) : (
            renderDatePicker(date, showDatePicker, setShowDatePicker, setDate, 'date')
          )}
          {Platform.OS === 'android' && <CalendarIcon size={20} color="#666" />}
        </TouchableOpacity>
        {Platform.OS === 'android' && renderDatePicker(date, showDatePicker, setShowDatePicker, setDate, 'date')}

        {/* Start Time */}
        <Text style={styles.label}>Start time</Text>
        <TouchableOpacity style={styles.inputRow} onPress={() => setShowStartTimePicker(true)}>
          {Platform.OS === 'android' ? (
            <Text style={styles.inputText}>{format(startTime, 'HH:mm')}</Text>
          ) : (
            renderDatePicker(startTime, showStartTimePicker, setShowStartTimePicker, setStartTime, 'time')
          )}
          {Platform.OS === 'android' && <Clock size={20} color="#666" />}
        </TouchableOpacity>
        {Platform.OS === 'android' && renderDatePicker(startTime, showStartTimePicker, setShowStartTimePicker, setStartTime, 'time')}

        {/* End Time */}
        <Text style={styles.label}>End time</Text>
        <TouchableOpacity style={styles.inputRow} onPress={() => setShowEndTimePicker(true)}>
          {Platform.OS === 'android' ? (
            <Text style={styles.inputText}>{format(endTime, 'HH:mm')}</Text>
          ) : (
            renderDatePicker(endTime, showEndTimePicker, setShowEndTimePicker, setEndTime, 'time')
          )}
          {Platform.OS === 'android' && <Clock size={20} color="#666" />}
        </TouchableOpacity>
        {Platform.OS === 'android' && renderDatePicker(endTime, showEndTimePicker, setShowEndTimePicker, setEndTime, 'time')}

        {/* --- ACTION BUTTONS --- */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{isEditing ? 'UPDATE EVENT' : 'SAVE EVENT'}</Text>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity style={[styles.saveButton, styles.deleteButton]} onPress={handleDelete}>
            <Text style={styles.saveButtonText}>DELETE EVENT</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontFamily: 'Pacifico-Regular', // Nếu có font custom
    fontSize: 20,
    color: '#3E2C22',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800', // Extra bold
    color: '#AC3C00',
    marginTop: 10,
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    height: 55, // Cố định chiều cao
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#5D4037', // Màu nâu như design
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: '#D32F2F', // Màu đỏ cho nút xóa
    marginTop: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
