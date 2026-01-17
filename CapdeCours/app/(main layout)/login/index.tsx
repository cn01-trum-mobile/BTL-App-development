import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { User, LogOut, Key, Calendar } from 'lucide-react-native';
import { authApi } from '@/app/services/authApi';
import { storeData } from '@/utils/asyncStorage';
import {
  syncLocalEventsWithBackend,
  syncCloudEventsToLocal,
  getCloudEventsCount,
  convertCloudEventsToLocal,
  deleteCloudEvents,
} from '@/app/services/localCalendarService';

const AUTH_SKIP_KEY = 'AUTH_SKIPPED';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Khi vào màn hình, kiểm tra xem đã có token chưa
  useEffect(() => {
    (async () => {
      const token = await authApi.getToken();
      if (token) {
        const storedUsername = await authApi.getUsername();
        setIsLoggedIn(true);
        setCurrentUser(storedUsername);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      await authApi.login(username.trim(), password);
      await storeData(AUTH_SKIP_KEY, 'false');

      // Cập nhật state UI
      setIsLoggedIn(true);
      setCurrentUser(username.trim());

      // Sau khi login thành công:
      // 1. Sync các event local lên backend (đẩy pending lên cloud)
      await syncLocalEventsWithBackend();
      // 2. Sync events từ cloud xuống local (tải về, tránh duplicate)
      await syncCloudEventsToLocal();
    } catch (err: any) {
      Alert.alert('Login failed', err?.message || 'Cannot login, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await storeData(AUTH_SKIP_KEY, 'true');
    router.replace('/(main layout)/login/chooseCalendar');
  };

  const handleOpenSystemCalendarConnect = () => {
    router.push('/(main layout)/login/chooseCalendar');
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Bước 1: Sync lại tất cả event chưa được sync lên cloud trước khi logout
      try {
        await syncLocalEventsWithBackend();
      } catch (err) {
        console.warn('Sync before logout failed:', err);
        // Vẫn tiếp tục logout dù sync lỗi
      }

      // Bước 2: Đếm số event cloud
      const cloudEventsCount = await getCloudEventsCount();

      // Bước 3: Nếu có event cloud, hỏi user muốn giữ hay xóa
      if (cloudEventsCount > 0) {
        Alert.alert('Cloud Events', `You have ${cloudEventsCount} event(s) synced to the cloud. What would you like to do?`, [
          {
            text: 'Keep as local',
            style: 'default',
            onPress: async () => {
              // Chuyển cloud events thành local (màu nâu)
              await convertCloudEventsToLocal();
              await performLogout();
            },
          },
          {
            text: 'Delete all',
            style: 'destructive',
            onPress: async () => {
              // Xóa hết cloud events
              await deleteCloudEvents();
              await performLogout();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setLoading(false);
            },
          },
        ]);
      } else {
        // Không có event cloud, logout luôn
        await performLogout();
      }
    } catch (err) {
      console.error('Logout error:', err);
      Alert.alert('Error', 'An error occurred during logout.');
      setLoading(false);
    }
  };

  const performLogout = async () => {
    await authApi.logout();
    await storeData(AUTH_SKIP_KEY, 'false');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setLoading(false);
    Alert.alert('Logged out', 'You have been logged out.');
  };

  const handleChangePassword = () => {
    router.push('/(main layout)/login/changeInfo');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            {isLoggedIn
              ? 'Your account is connected. You can manage cloud sync and calendar sources here.'
              : 'Sign in to sync your study schedule to the cloud.'}
          </Text>
        </View>

        {isLoggedIn ? (
          <View style={styles.form}>
            <View style={styles.profileSection}>
              <View style={styles.profileIconContainer}>
                <User size={24} color="#AC3C00" />
              </View>
              <Text style={styles.profileLabel}>Signed in as</Text>
              <Text style={styles.profileName}>{currentUser || 'User'}</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleOpenSystemCalendarConnect} activeOpacity={0.8}>
              <Calendar size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Add system calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleChangePassword} activeOpacity={0.8}>
              <Key size={18} color="#374151" />
              <Text style={styles.secondaryButtonText}>Change password</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8} disabled={loading}>
              {loading ? (
                <ActivityIndicator testID="activity-indicator" color="#B91C1C" />
              ) : (
                <>
                  <LogOut size={18} color="#B91C1C" />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor="#9CA3AF"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
              {loading ? <ActivityIndicator testID="activity-indicator" color="#FFF" /> : <Text style={styles.loginButtonText}>LOGIN</Text>}
            </TouchableOpacity>
            {/* Thêm vào dưới nút Skip hoặc Login */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
              <Text style={{ color: '#6B7280' }}>{"Don't have an account?"} </Text>
              <TouchableOpacity onPress={() => router.push('/(main layout)/login/registerScreen' as any)}>
                <Text style={{ color: '#AC3C00', fontWeight: 'bold' }}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={loading} activeOpacity={0.7}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
              <Text style={styles.skipHint}>You can still use local & system calendar without an account.</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
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
  headerSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#AC3C00',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#646982',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
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
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE8BB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#3E2C22',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#3E2C22',
    marginBottom: 8,
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
  loginButton: {
    marginTop: 8,
    backgroundColor: '#AC3C00',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#AC3C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 52,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  skipButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 4,
  },
  skipHint: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#AC3C00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#AC3C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  logoutButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  logoutButtonText: {
    color: '#B91C1C',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
});
