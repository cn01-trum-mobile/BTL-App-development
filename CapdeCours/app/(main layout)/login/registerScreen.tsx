import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native'; // Chỉ giữ lại icon Back
import { authApi } from '@/app/services/authApi';

export default function RegisterScreen() {
  const router = useRouter();
  
  // State form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.register(name.trim(), username.trim(), password);
      
      Alert.alert(
        'Success', 
        'Account created successfully! Please login.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Registration failed', err?.message + '\nPassword needs at least 8 characters, including 1 uppercase character, 1 number and 1 special character' || 'Cannot create account, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up to start managing your study schedule and sync across devices.
            </Text>
          </View>

          <View style={styles.form}>
            {/* Input Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: John Doe" 
                placeholderTextColor="#9CA3AF"
                value={name} 
                onChangeText={setName} 
              />
            </View>

            {/* Input Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ex: johndoe123" 
                placeholderTextColor="#9CA3AF"
                value={username} 
                onChangeText={setUsername} 
                autoCapitalize="none" 
                autoCorrect={false} 
              />
            </View>

            {/* Input Password */}
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

            {/* Input Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Re-enter password" 
                placeholderTextColor="#9CA3AF"
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                secureTextEntry 
              />
            </View>

            {/* Button Register - Sử dụng style loginButton cho đồng bộ */}
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleRegister} 
              disabled={loading} 
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginButtonText}>SIGN UP</Text>
              )}
            </TouchableOpacity>

            {/* Link Login */}
            <View style={styles.footerLinkContainer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E3',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  topBar: {
    paddingTop: 50, // Điều chỉnh tùy theo SafeAreaView của máy
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#FFF8E3',
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
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
  // Thêm styles cho phần Footer Link ở dưới cùng
  footerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#AC3C00',
  }
});