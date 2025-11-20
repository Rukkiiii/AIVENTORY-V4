import { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import api from '@/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [role, setRole] = useState<'Admin' | 'Staff'>('Admin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textTertiaryColor = useThemeColor({}, 'textTertiary');
  const primaryColor = useThemeColor({}, 'primary');

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirm) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post('/register', {
        fullName,
        email,
        password,
        role,
      });
      
      if (__DEV__) {
        console.log('✅ Registration successful');
      }
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.replace('/login') }
      ]);
    } catch (error: any) {
      if (__DEV__) {
        console.error('Registration error:', error?.response?.data?.error || error?.message || error);
      }
      if (error?.response?.data?.error) {
        Alert.alert('Error', error.response.data.error);
      } else if (error?.userMessage) {
        Alert.alert('Error', error.userMessage);
      } else {
        Alert.alert('Error', 'Network error. Please check your connection and make sure the backend server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.header}>
              <ThemedText style={[styles.title, { color: primaryColor }]}>
                SMART INVENTORY MANAGEMENT
              </ThemedText>
              <ThemedText style={[styles.subtitle, { color: textTertiaryColor }]}>
                Predictive Replenishment and Alert Notifications
              </ThemedText>
              <ThemedText type="title" style={[styles.pageTitle, { color: textColor }]}>
                Create Account
              </ThemedText>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>
                Full Name
              </ThemedText>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Jane Doe"
                style={[
                  styles.input,
                  { backgroundColor: cardBackgroundColor, borderColor, color: textColor },
                ]}
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Email</ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  { backgroundColor: cardBackgroundColor, borderColor, color: textColor },
                ]}
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>
                Password
              </ThemedText>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                style={[
                  styles.input,
                  { backgroundColor: cardBackgroundColor, borderColor, color: textColor },
                ]}
                placeholderTextColor={textTertiaryColor}
              />
            </View>
            <View style={styles.formGroup}>
              <ThemedText style={[styles.label, { color: textSecondaryColor }]}>
                Confirm Password
              </ThemedText>
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                secureTextEntry
                style={[
                  styles.input,
                  { backgroundColor: cardBackgroundColor, borderColor, color: textColor },
                ]}
                placeholderTextColor={textTertiaryColor}
              />
            </View>

            <View style={[styles.roleToggle, { backgroundColor: borderColor }]}>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === 'Admin' && styles.roleBtnActive,
                  role === 'Admin'
                    ? { backgroundColor: primaryColor }
                    : { backgroundColor: cardBackgroundColor },
                ]}
                onPress={() => setRole('Admin')}
              >
                <ThemedText
                  style={[
                    styles.roleText,
                    role === 'Admin' && styles.roleTextActive,
                    role === 'Admin' ? { color: '#ffffff' } : { color: textSecondaryColor },
                  ]}
                >
                  Admin
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === 'Staff' && styles.roleBtnActive,
                  role === 'Staff'
                    ? { backgroundColor: primaryColor }
                    : { backgroundColor: cardBackgroundColor },
                ]}
                onPress={() => setRole('Staff')}
              >
                <ThemedText
                  style={[
                    styles.roleText,
                    role === 'Staff' && styles.roleTextActive,
                    role === 'Staff' ? { color: '#ffffff' } : { color: textSecondaryColor },
                  ]}
                >
                  Staff
                </ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: primaryColor }]}
              onPress={handleRegister}
            >
              <ThemedText style={[styles.loginBtnText, { color: '#ffffff' }]}>
                Create Account
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <ThemedText style={[styles.accountText, { color: textTertiaryColor }]}>
                Already have an account?{' '}
                <Link href="/login">
                  <ThemedText style={[styles.linkText, { color: primaryColor }]}>
                    Back to Login
                  </ThemedText>
                </Link>
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 10,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    display: 'flex',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderRadius: 5,
    fontSize: 16,
  },
  roleToggle: {
    flexDirection: 'row',
    marginVertical: 24,
    borderRadius: 5,
    overflow: 'hidden',
  },
  roleBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  roleBtnActive: {
  },
  roleText: {
    fontWeight: '500',
  },
  roleTextActive: {
  },
  loginBtn: {
    width: '100%',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  accountText: {
    fontSize: 14,
  },
  linkText: {
    fontWeight: '500',
  },
});