import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface WorkspaceGuardProps {
  children: React.ReactNode;
  currentWorkspace: any;
}

export function WorkspaceGuard({ children, currentWorkspace }: WorkspaceGuardProps) {
  const theme = useTheme();

  if (!currentWorkspace) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">No Active Workspace</ThemedText>
        <ThemedText type="default" style={styles.subtitle}>
          Please select or create a wedding workspace first to access this module.
        </ThemedText>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.text }]}
          onPress={() => router.replace('/')}
        >
          <ThemedText style={[styles.buttonText, { color: theme.background }]}>
            Select Workspace
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: Spacing.two,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: 'bold',
  },
});
