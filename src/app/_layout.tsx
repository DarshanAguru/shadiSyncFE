import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import AuthScreen from '@/components/auth/AuthScreen';
import BiometricUnlockScreen from '@/components/auth/BiometricUnlockScreen';
import { useAuthStore } from '@/stores/authStore';
import Toast from '@/components/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLocked = useAuthStore((state) => state.isLocked);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Toast />
        {!isAuthenticated ? (
          <AuthScreen />
        ) : isLocked ? (
          <BiometricUnlockScreen />
        ) : (
          <AppTabs />
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
