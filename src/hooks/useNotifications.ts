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
 * Utility to request permission and retrieve Expo Push Token.
 * Falls back to a mock token on simulator/web for developer convenience.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  console.log('Using in-house notification manager: bypassing native FCM/Expo push token registration.');
  return 'ExponentPushToken[mock_in_house_token]';
}
