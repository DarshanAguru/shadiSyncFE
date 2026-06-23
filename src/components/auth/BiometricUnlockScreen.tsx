import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import { useQueryClient } from '@tanstack/react-query';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/stores/authStore';

export default function BiometricUnlockScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { setLocked, clearAuth, user, isBiometricsEnabled, setBiometricsEnabled } = useAuthStore();
  
  const handleLogout = () => {
    queryClient.clear();
    clearAuth();
  };

  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    checkDeviceSupport();
  }, []);

  const checkDeviceSupport = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        setIsSupported(true);
        // Auto trigger biometrics
        triggerBiometricAuth();
      } else {
        setIsSupported(false);
        // If biometrics not supported on device, unlock automatically
        setLocked(false);
      }
    } catch (err) {
      setIsSupported(false);
      setLocked(false);
    }
  };

  const triggerBiometricAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock ShadiSync Workspace',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        setLocked(false);
        // Ensure enabled in settings if user logged in successfully via it
        if (!isBiometricsEnabled) {
          setBiometricsEnabled(true);
        }
      } else {
        setErrorMsg('Authentication failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Biometric authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Image
          source={require('@/assets/images/wedding_banner.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />

        <View style={styles.brandGroup}>
          <ThemedText type="title" style={[styles.title, { color: theme.text }]}>ShadiSync</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>
            Welcome back, <ThemedText type="smallBold" style={{ color: theme.text }}>{user?.name || 'Planner'}</ThemedText>!
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            Verify fingerprint to access your wedding workspace
          </ThemedText>
        </View>

        <View style={styles.sensorArea}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.text} />
          ) : (
            <TouchableOpacity
              style={[styles.fingerprintBtn, { backgroundColor: theme.backgroundSelected, borderColor: theme.text }]}
              onPress={triggerBiometricAuth}
            >
              <Ionicons name="finger-print" size={54} color={theme.text} />
            </TouchableOpacity>
          )}

          {errorMsg && (
            <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
          )}

          {!loading && (
            <TouchableOpacity onPress={triggerBiometricAuth} style={styles.retryLink}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>Tap to scan fingerprint</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: theme.textSecondary }]}
            onPress={handleLogout}
          >
            <ThemedText style={{ color: theme.textSecondary, fontWeight: 'bold' }}>
              Switch Account / Log Out
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#EADFD9',
  },
  brandGroup: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 4,
  },
  sensorArea: {
    alignItems: 'center',
    gap: 16,
    marginVertical: 12,
  },
  fingerprintBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  retryLink: {
    marginTop: 8,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  logoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
  },
});
