import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../utils/api';
import { useToastStore } from '@/stores/toastStore';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
  };
}

export default function AuthScreen() {
  const theme = useTheme();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { showToast } = useToastStore();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Validation Errors
  const [errors, setErrors] = useState<{ name?: string; phone?: string; password?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!isLogin && name.trim().length === 0) {
      newErrors.name = 'Name is required';
    }
    if (phone.trim().length < 8) {
      newErrors.phone = 'Enter a valid phone number';
    }
    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin 
        ? { phone: phone.trim(), password }
        : { name: name.trim(), phone: phone.trim(), password };
      const data = await apiRequest<AuthResponse>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      // Save to Zustand auth store
      setAuth(data.token, data.user);
    } catch (err: any) {
      showToast('Authentication Error', err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Image
            source={require('@/assets/images/wedding_banner.png')}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <ThemedView style={styles.brandContainer}>
            <Image
              source={require('@/assets/images/shadisync_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <ThemedText type="title" style={styles.brandTitle}>ShadiSync</ThemedText>
            <ThemedText type="default" style={styles.brandSubtitle}>
              {isLogin ? 'Collaborative Wedding Workspace' : 'Create Your Workspace Account'}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.formContainer}>
            {/* Name field for Signup */}
            {!isLogin && (
              <ThemedView style={styles.inputWrapper}>
                <ThemedText type="smallBold" style={styles.label}>Full Name</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundElement,
                      color: theme.text,
                      borderColor: errors.name ? '#ff3b30' : 'transparent',
                    },
                  ]}
                  placeholder="Enter your name"
                  placeholderTextColor={theme.textSecondary}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  autoCapitalize="words"
                />
                {errors.name && <ThemedText type="small" style={styles.errorText}>{errors.name}</ThemedText>}
              </ThemedView>
            )}

            {/* Phone Number Field */}
            <ThemedView style={styles.inputWrapper}>
              <ThemedText type="smallBold" style={styles.label}>Phone Number</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundElement,
                    color: theme.text,
                    borderColor: errors.phone ? '#ff3b30' : 'transparent',
                  },
                ]}
                placeholder="Enter phone number"
                placeholderTextColor={theme.textSecondary}
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              {errors.phone && <ThemedText type="small" style={styles.errorText}>{errors.phone}</ThemedText>}
            </ThemedView>

            {/* Password Field */}
            <ThemedView style={styles.inputWrapper}>
              <ThemedText type="smallBold" style={styles.label}>Password</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundElement,
                    color: theme.text,
                    borderColor: errors.password ? '#ff3b30' : 'transparent',
                  },
                ]}
                placeholder="Enter password"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                secureTextEntry
                autoCapitalize="none"
              />
              {errors.password && <ThemedText type="small" style={styles.errorText}>{errors.password}</ThemedText>}
            </ThemedView>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: loading ? theme.backgroundSelected : theme.text }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <ThemedText style={[styles.submitButtonText, { color: theme.background }]}>
                  {isLogin ? 'Log In' : 'Sign Up'}
                </ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>

          {/* Toggle Login/Signup */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              setIsLogin(!isLogin);
              setErrors({});
            }}
            activeOpacity={0.8}
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                {isLogin ? 'Sign Up' : 'Log In'}
              </ThemedText>
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  bannerImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: Spacing.two,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: Spacing.two,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.five,
    gap: Spacing.one,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    opacity: 0.7,
    textAlign: 'center',
  },
  formContainer: {
    gap: Spacing.three,
  },
  inputWrapper: {
    gap: Spacing.one,
  },
  label: {
    opacity: 0.8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: {
    color: '#ff3b30',
    marginTop: 2,
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: Spacing.four,
    paddingVertical: Spacing.two,
  },
});
