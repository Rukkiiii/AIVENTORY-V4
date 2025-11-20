import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Animated, Easing, BackHandler } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter, Link, useFocusEffect } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login } from '@/services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const backgroundFade = useState(new Animated.Value(0))[0];
  const router = useRouter();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textTertiaryColor = useThemeColor({}, 'textTertiary');
  const primaryColor = useThemeColor({}, 'primary');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // Use the API service which handles base URL automatically
      const response = await login(
        email,
        password,
        userType === 'admin' ? 'Admin' : 'Staff'
      );

      const { token, user, role } = response.data;

      // Save token and user info
      await AsyncStorage.multiSet([
        ['token', token],
        ['user', JSON.stringify(user)],
        ['role', role],
      ]);

      if (__DEV__) {
        console.log('✅ Login successful');
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      let message = 'An unexpected error occurred.';
      if (error?.userMessage) {
        // Use enhanced error message from API interceptor
        message = error.userMessage;
      } else if (error?.response) {
          if (__DEV__) {
            console.error('Login error:', error.response?.data?.error || error.message);
          }
          message = error.response?.data?.error || 'Network error. Please make sure your backend is running.';
      } else if (error?.message) {
          if (__DEV__) {
            console.error('Login error:', error.message);
          }
          if (error.code === 'ECONNREFUSED' || error.message.includes('Network') || error.message.includes('timeout')) {
            message = `Cannot connect to backend. Please make sure:\n\n1. Backend is running (npm start in server folder)\n2. Backend is on port 5001`;
          } else {
            message = error.message;
          }
      } else {
          if (__DEV__) {
            console.error('Login error:', error);
          }
      }
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    Animated.timing(backgroundFade, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [backgroundFade]);

  // Prevent going back from login to a previous authenticated screen
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => true; // block hardware back
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        subscription && subscription.remove();
      };
    }, []),
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Animated.View style={[styles.backgroundOverlay, { opacity: backgroundFade }]}> 
        <View style={[styles.accentCircle, { backgroundColor: primaryColor }]} />
        <View style={[styles.accentCircleSecondary, { borderColor: primaryColor }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.loginCard,
          {
            backgroundColor: cardBackgroundColor,
            borderColor,
            transform: [
              {
                translateY: backgroundFade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
            opacity: backgroundFade,
          },
        ]}
      >
        <View style={[styles.brandBadge, { backgroundColor: cardBackgroundColor }]}>
          <ThemedText style={[styles.brandText, { color: primaryColor }]}>AIVENTORY</ThemedText>
        </View>

        <View style={styles.loginHeader}>
          <ThemedText style={[styles.title, { color: primaryColor }]}>Welcome Back</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textTertiaryColor }]}>
            Sign in to manage inventory, track alerts, and issue invoices on the go.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Email</ThemedText>
            <View style={[styles.inputWrapper, { borderColor, backgroundColor: cardBackgroundColor }]}> 
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@email.com"
                placeholderTextColor={textTertiaryColor}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Password</ThemedText>
            <View style={[styles.inputWrapper, { borderColor, backgroundColor: cardBackgroundColor }]}> 
              <TextInput
                style={[styles.input, { color: textColor }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
                placeholder="••••••••"
                placeholderTextColor={textTertiaryColor}
              />
              <TouchableOpacity
                style={styles.toggleVisibility}
                onPress={() => setIsPasswordVisible((prev) => !prev)}
              >
                <ThemedText style={{ color: primaryColor, fontWeight: '600' }}>
                  {isPasswordVisible ? 'Hide' : 'Show'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={[styles.label, { color: textSecondaryColor }]}>Sign in as</ThemedText>
            <View style={[styles.roleToggle, { borderColor }]}> 
              <TouchableOpacity
                style={[styles.roleOption, userType === 'admin' ? { backgroundColor: primaryColor } : null]}
                onPress={() => setUserType('admin')}
                activeOpacity={0.8}
              >
                <ThemedText style={[styles.roleOptionText, userType === 'admin' ? { color: '#fff' } : { color: textSecondaryColor }]}>Admin</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, userType === 'staff' ? { backgroundColor: primaryColor } : null]}
                onPress={() => setUserType('staff')}
                activeOpacity={0.8}
              >
                <ThemedText style={[styles.roleOptionText, userType === 'staff' ? { color: '#fff' } : { color: textSecondaryColor }]}>Staff</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: primaryColor, opacity: loading ? 0.7 : 1 }]} 
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.loginBtnText}>Sign In</ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            activeOpacity={0.8}
            onPress={() => router.push('/register')}
          >
            <ThemedText style={[styles.secondaryActionText, { color: textTertiaryColor }]}>
              Need an account? <ThemedText style={[styles.linkText, { color: primaryColor }]}>Create one</ThemedText>
            </ThemedText>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentCircle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -80,
    right: -100,
    opacity: 0.08,
  },
  accentCircleSecondary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: -60,
    left: -80,
    opacity: 0.12,
    borderWidth: 2,
  },
  loginCard: {
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  brandBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  brandText: {
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  loginHeader: {
    marginBottom: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  toggleVisibility: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  roleToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleOptionText: {
    fontWeight: '600',
    fontSize: 15,
  },
  loginBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.4,
  },
  secondaryAction: {
    alignSelf: 'center',
  },
  secondaryActionText: {
    fontSize: 14,
  },
  linkText: {
    fontWeight: '600',
  },
});
