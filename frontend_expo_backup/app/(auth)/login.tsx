import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // OTP Modal state
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [mockedOTP, setMockedOTP] = useState('');

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.requires_2fa) {
        // Show OTP in modal for demo purposes
        if (result.mocked_otp) {
          setMockedOTP(result.mocked_otp);
          setShowOTPModal(true);
        } else {
          router.push({ pathname: '/(auth)/verify-otp', params: { email } });
        }
      }
    } catch (error: any) {
      showAlert('Login Failed', error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPModalContinue = () => {
    setShowOTPModal(false);
    router.push({ pathname: '/(auth)/verify-otp', params: { email } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>TREVENTA</Text>
            <Text style={styles.logoSubtext}>VENTURES</Text>
          </View>

          <Text style={styles.tagline}>Strategic Capital. Real Ventures. Transparent Outcomes.</Text>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Secure Access</Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#718096" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#A0AEC0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#718096" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#A0AEC0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#718096"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Authenticating...' : 'Secure Access'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer Links */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.push('/(auth)/request-invite')}>
              <Text style={styles.linkText}>Request Invite</Text>
            </TouchableOpacity>
            <Text style={styles.divider}>|</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.linkText}>Register with Code</Text>
            </TouchableOpacity>
          </View>

          {/* Confidential Badge */}
          <View style={styles.confidentialBadge}>
            <Ionicons name="lock-closed" size={12} color="#718096" />
            <Text style={styles.confidentialText}>CONFIDENTIAL - INVITE ONLY</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Modal */}
      <Modal visible={showOTPModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="shield-checkmark" size={48} color="#C9A227" />
            </View>
            <Text style={styles.modalTitle}>2FA Verification</Text>
            <Text style={styles.modalMessage}>Your OTP code is:</Text>
            <View style={styles.otpDisplay}>
              <Text style={styles.otpCode}>{mockedOTP}</Text>
            </View>
            <Text style={styles.modalNote}>
              (This is shown for demo purposes. In production, check your email.)
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleOTPModalContinue}>
              <Text style={styles.modalButtonText}>Continue to Verify</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A2E',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#1A365D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  logoSubtext: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C9A227',
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 11,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 32,
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    color: '#FFFFFF',
    fontSize: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A227',
    borderRadius: 12,
    height: 52,
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  linkText: {
    color: '#C9A227',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    color: '#4A5568',
    marginHorizontal: 12,
  },
  confidentialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  confidentialText: {
    fontSize: 10,
    color: '#718096',
    marginLeft: 6,
    letterSpacing: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1A2332',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 16,
  },
  otpDisplay: {
    backgroundColor: 'rgba(201,162,39,0.1)',
    borderWidth: 2,
    borderColor: '#C9A227',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 16,
  },
  otpCode: {
    fontSize: 32,
    fontWeight: '800',
    color: '#C9A227',
    letterSpacing: 8,
  },
  modalNote: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  modalButton: {
    backgroundColor: '#C9A227',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    width: '100%',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
