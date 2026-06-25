import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiRequest } from '../utils/api';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
}

interface FetchNotificationsResponse {
  notifications: NotificationItem[];
}

/**
 * Hook to retrieve user's system notifications.
 */
export function useNotificationsList() {
  return useQuery<FetchNotificationsResponse, Error>({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<FetchNotificationsResponse>('/notifications'),
  });
}

/**
 * Hook to mark notifications as read.
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    { notificationId?: string }
  >({
    mutationFn: (variables) =>
      apiRequest('/notifications', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Hook to send the Expo push token to the backend.
 */
export function useRegisterPushToken() {
  return useMutation<
    { message: string },
    Error,
    { pushToken: string | null }
  >({
    mutationFn: (variables) =>
      apiRequest<{ message: string }>('/notifications/register-token', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
  });
}

/**
 * Requests notification permissions and retrieves the real Expo Push Token.
 * Returns null gracefully on simulators, permission denial, or missing Firebase config.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Running on simulator — skipping push token registration.');
    return null;
  }

  try {
    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push] Notification permission denied by user.');
      return null;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ShadiSync Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E91E63',
      });
    }

    // Get the real Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    console.log('[Push] Expo Push Token:', tokenData.data);
    return tokenData.data;
  } catch (err: any) {
    // Firebase not configured yet (missing google-services.json / FCM credentials).
    // The in-app notification tray still works via the backend DB — this is non-fatal.
    console.warn(
      '[Push] Could not obtain push token. To enable OS-level push notifications, ' +
      'configure google-services.json and FCM credentials per ' +
      'https://docs.expo.dev/push-notifications/fcm-credentials/\n' +
      'Error:', err?.message ?? err
    );
    return null;
  }
}
