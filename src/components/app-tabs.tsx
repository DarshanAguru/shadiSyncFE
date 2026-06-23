import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, Platform, StyleSheet, View, TouchableOpacity } from 'react-native';

import { Colors } from '@/constants/theme';
import { ThemedText } from './themed-text';

import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

  const showTasksTab = (() => {
    if (!currentWorkspace) return true;
    const permissions = currentWorkspace.permissions;
    if (permissions && permissions['Tasks']) {
      return permissions['Tasks'].view !== false;
    }
    return true;
  })();

  const showExpensesTab = (() => {
    if (!currentWorkspace) return true;
    const permissions = currentWorkspace.permissions;
    if (permissions && permissions['Expenses']) {
      return permissions['Expenses'].view !== false;
    }
    return true;
  })();

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
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          href: showTasksTab ? undefined : null,
          title: 'Tasks',
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
        name="expenses"
        options={{
          href: showExpensesTab ? undefined : null,
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

      <Tabs.Screen
        name="documents"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="create-expense"
        options={{
          href: null,
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
});
