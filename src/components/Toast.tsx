import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated, View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useToastStore } from '@/stores/toastStore';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

export default function Toast() {
  const { toast, hideToast } = useToastStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const [visibleToast, setVisibleToast] = useState<typeof toast>(null);

  useEffect(() => {
    if (toast) {
      setVisibleToast(toast);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (visibleToast) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisibleToast(null);
      });
    }
  }, [toast]);

  if (!visibleToast) return null;

  let iconName: any = 'information-circle-outline';
  let iconColor = '#E91E63';

  if (visibleToast.type === 'success') {
    iconName = 'checkmark-circle';
    iconColor = '#4CAF50';
  } else if (visibleToast.type === 'error') {
    iconName = 'alert-circle';
    iconColor = '#F44336';
  }

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          top: insets.top + Spacing.two,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable
        onPress={hideToast}
        style={[
          styles.toastContainer,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      >
        <Ionicons name={iconName} size={22} color={iconColor} style={styles.icon} />
        <View style={styles.content}>
          <ThemedText type="smallBold" style={[styles.title, { color: theme.text }]}>
            {visibleToast.title}
          </ThemedText>
          <ThemedText type="small" style={[styles.message, { color: theme.textSecondary }]}>
            {visibleToast.message}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 9999,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
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
  icon: {
    marginRight: Spacing.two,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 12,
    marginTop: 2,
  },
});
