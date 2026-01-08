import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, User, Key, Save } from 'lucide-react-native';
import { authApi } from '@/app/services/authApi';

export default function ChangeInfoScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const username = await authApi.getUsername();
      setCurrentUsername(username);
    })();
  }, []);

  const handleSave = async () => {
    if (!currentUsername) {
      Alert.alert('Error', 'Username not found');
      return;
    }

    // Validate password if provided
    if (password) {
      if (password.length < 6) {
        Alert.alert('Invalid Password', 'Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match');
        return;
      }
    }

    // At least one field must be filled
    if (!name.trim() && !password) {
      Alert.alert('Missing Information', 'Please enter at least name or password to update');
      return;
    }

    setLoading(true);
    try {
      await authApi.updateUser(currentUsername, name.trim() || undefined, password || undefined);
      Alert.alert('Success', 'Your information has been updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update your information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
            <ChevronLeft size={24} color="#3E2C22" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Information</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.form}>
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              <User size={24} color="#AC3C00" />
            </View>
            <Text style={styles.infoText}>Update your profile information</Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <User size={16} color="#3E2C22" />
              <Text style={styles.label}>Name</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelContainer}>
              <Key size={16} color="#3E2C22" />
              <Text style={styles.label}>New Password</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter new password (optional)"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Text style={styles.hintText}>Leave empty if you don't want to change password</Text>
          </View>

          {password ? (
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Key size={16} color="#3E2C22" />
                <Text style={styles.label}>Confirm Password</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Save size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E3',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#AC3C00',
    flex: 1,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE8BB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#646982',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#3E2C22',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#FFF',
    color: '#3E2C22',
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    marginTop: 6,
    paddingLeft: 4,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#AC3C00',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#AC3C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 52,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
});

