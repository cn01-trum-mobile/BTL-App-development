import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
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
    // TODO: Điều hướng sang màn đổi mật khẩu riêng nếu bạn tạo route, tạm thời chỉ alert
    Alert.alert('Change password', 'Implement change password screen / API here.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>
        {isLoggedIn ? 'Your account is connected. You can manage cloud sync and calendar sources here.' : 'Sign in to sync your study schedule to the cloud.'}
      </Text>

      {isLoggedIn ? (
        <View style={styles.form}>
          <Text style={styles.profileLabel}>Signed in as</Text>
          <Text style={styles.profileName}>{currentUser || 'User'}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleOpenSystemCalendarConnect}>
            <Text style={styles.primaryButtonText}>Add from system calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleChangePassword}>
            <Text style={styles.secondaryButtonText}>Change password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} placeholder="Enter username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <TextInput style={styles.input} placeholder="Enter password" value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>LOGIN</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={loading}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
            <Text style={styles.skipHint}>You can still use local & system calendar without an account.</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E3',
    paddingHorizontal: 24,
    paddingTop: 80,
    fontFamily: 'Poppins-Regular',
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
    marginBottom: 32,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  profileLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#3E2C22',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#3E2C22',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#FFF',
  },
  loginButton: {
    marginTop: 24,
    backgroundColor: '#AC3C00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    fontWeight: '600',
  },
  skipHint: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#AC3C00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  logoutButtonText: {
    color: '#B91C1C',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    fontWeight: '600',
  },
});
