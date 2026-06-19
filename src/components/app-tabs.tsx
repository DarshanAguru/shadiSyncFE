import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, Platform, StyleSheet, View, TouchableOpacity } from 'react-native';

import { Colors } from '@/constants/theme';
import { ThemedText } from './themed-text';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E91E63',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.backgroundSelected,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Metrics',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'analytics' : 'analytics-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tracking',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'checkbox' : 'checkbox-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="create-expense"
        options={{
          title: 'Log',
          tabBarButton: (props) => {
            return (
              <TouchableOpacity
                onPress={() => {
                  router.push('/expenses?action=create');
                }}
                activeOpacity={0.85}
                style={styles.floatingTabButtonWrapper}
              >
                <View style={[
                  styles.floatingTabButton,
                  { backgroundColor: colors.text }
                ]}>
                  <Ionicons name="add" size={26} color={colors.background} />
                </View>
                <ThemedText style={[
                  styles.tabBarLabelText,
                  { color: colors.textSecondary }
                ]}>
                  Log
                </ThemedText>
              </TouchableOpacity>
            );
          }
        }}
      />

      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'wallet' : 'wallet-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'menu' : 'menu-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    borderRadius: 20,
    height: 64,
    borderWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  tabBarIcon: {
    marginBottom: -2,
  },
  floatingTabButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -14,
  },
  floatingTabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  tabBarLabelText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
