import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, Platform, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { ThemedText } from './themed-text';

import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useWorkspaces } from '@/hooks/useWorkspaces';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);
  const { data: workspacesData } = useWorkspaces();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 24 : 12);
  const tabBarHeight = (Platform.OS === 'ios' ? 56 : 52) + bottomPadding;

  useEffect(() => {
    if (workspacesData?.workspaces && currentWorkspace) {
      const updated = workspacesData.workspaces.find((w) => w.id === currentWorkspace.id);
      if (updated) {
        const cleanDate = (dateStr: string | undefined | null) => {
          if (!dateStr) return '';
          return dateStr.split('T')[0];
        };
        const newWorkspace = {
          id: updated.id,
          name: updated.name,
          weddingDate: updated.wedding_date,
          role: updated.role,
          cover_image_url: updated.cover_image_url,
          permissions: updated.permissions,
          allocated_budget: updated.allocated_budget,
        };
        if (
          currentWorkspace.name !== newWorkspace.name ||
          cleanDate(currentWorkspace.weddingDate) !== cleanDate(newWorkspace.weddingDate) ||
          currentWorkspace.role !== newWorkspace.role ||
          currentWorkspace.cover_image_url !== newWorkspace.cover_image_url ||
          JSON.stringify(currentWorkspace.permissions) !== JSON.stringify(newWorkspace.permissions) ||
          currentWorkspace.allocated_budget !== newWorkspace.allocated_budget
        ) {
          setCurrentWorkspace(newWorkspace);
        }
      }
    }
  }, [workspacesData, currentWorkspace, setCurrentWorkspace]);

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
            height: tabBarHeight,
            paddingBottom: bottomPadding,
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
    borderTopWidth: 1,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
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
