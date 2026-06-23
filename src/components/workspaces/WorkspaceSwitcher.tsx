import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useToastStore } from '@/stores/toastStore';

import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspaces, useCreateWorkspace, Workspace } from '../../hooks/useWorkspaces';
import { usePendingInvitations, useRespondInvitation } from '../../hooks/useInvitations';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export default function WorkspaceSwitcher() {
  const theme = useTheme();
  const { data, isLoading, isError, refetch } = useWorkspaces();
  const { data: invitesData, refetch: refetchInvites } = usePendingInvitations();
  const createMutation = useCreateWorkspace();
  const respondMutation = useRespondInvitation();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();

  const { showToast } = useToastStore();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [weddingDate, setWeddingDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSelect = (ws: Workspace) => {
    setCurrentWorkspace({
      id: ws.id,
      name: ws.name,
      weddingDate: ws.wedding_date,
      role: ws.role,
      cover_image_url: ws.cover_image_url,
      permissions: ws.permissions,
      allocated_budget: ws.allocated_budget,
    });
  };

  const handleCreate = async () => {
    if (name.trim().length === 0) {
      showToast('Validation Error', 'Workspace name is required', 'error');
      return;
    }

    try {
      const response = await createMutation.mutateAsync({
        name: name.trim(),
        weddingDate,
      });
      // Automatically select the newly created workspace
      handleSelect(response.workspace);
      setName('');
      setShowCreateForm(false);
      setShowDatePicker(false);
      showToast('Success', 'Workspace created successfully', 'success');
    } catch (error: any) {
      showToast('Error', error.message || 'Failed to create workspace', 'error');
    }
  };

  const handleRespond = async (id: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      await respondMutation.mutateAsync({ id, action });
      showToast('Success', `Invitation ${action.toLowerCase()}ed successfully`, 'success');
      refetch();
      refetchInvites();
    } catch (error: any) {
      showToast('Error', error.message || 'Failed to respond to invitation', 'error');
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.text} />
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Error loading workspaces.</ThemedText>
        <TouchableOpacity style={styles.button} onPress={() => refetch()}>
          <ThemedText style={{ color: theme.background }}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const workspaces = data?.workspaces || [];
  const pendingInvites = invitesData?.invitations || [];

  if (showCreateForm) {
    return (
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Image
          source={require('@/assets/images/wedding_banner.png')}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        <ThemedView style={styles.header}>
          <ThemedText type="title">New Workspace</ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            Set up your shared wedding workspace
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.form}>
          <ThemedView style={styles.inputWrapper}>
            <ThemedText type="smallBold">Workspace Name</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              placeholder="e.g. John & Jane's Wedding"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </ThemedView>

          <ThemedView style={styles.inputWrapper}>
            <ThemedText type="smallBold">Wedding Date</ThemedText>
            <TouchableOpacity
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                  borderWidth: 1,
                  justifyContent: 'center',
                },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <ThemedText style={{ color: weddingDate ? theme.text : theme.textSecondary }}>
                {weddingDate || 'Select Wedding Date'}
              </ThemedText>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={(() => {
                  if (!weddingDate) return new Date();
                  const parsed = Date.parse(weddingDate);
                  return isNaN(parsed) ? new Date() : new Date(parsed);
                })()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setWeddingDate(selectedDate.toISOString().split('T')[0]);
                  }
                }}
              />
            )}
          </ThemedView>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.text }]}
            onPress={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText style={[styles.buttonText, { color: theme.background }]}>
                Create Workspace
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCreateForm(false)}
          >
            <ThemedText style={{ color: theme.textSecondary }}>Cancel</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Image
        source={require('@/assets/images/wedding_banner.png')}
        style={styles.bannerImage}
        resizeMode="cover"
      />
      {/* 1. Pending Invitations Section */}
      {pendingInvites.length > 0 && (
        <ThemedView style={styles.invitesSection}>
          <ThemedText type="smallBold" style={styles.sectionHeader}>Pending Invitations</ThemedText>
          <ThemedView style={styles.list}>
            {pendingInvites.map((invite) => (
              <ThemedView
                key={invite.id}
                style={[styles.card, { backgroundColor: theme.backgroundElement, borderLeftColor: '#E91E63', borderLeftWidth: 4 }]}
              >
                <ThemedView style={styles.cardHeader}>
                  <ThemedView style={{ flex: 1, gap: 2 }}>
                    <ThemedText type="smallBold" style={{ fontSize: 16 }}>{invite.workspace_name}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Invited by {invite.inviter_name} as {invite.role}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                <ThemedView style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: theme.text }]}
                    onPress={() => handleRespond(invite.id, 'ACCEPT')}
                    disabled={respondMutation.isPending}
                  >
                    {respondMutation.isPending ? (
                      <ActivityIndicator size="small" color={theme.background} />
                    ) : (
                      <ThemedText style={[styles.smallBtnText, { color: theme.background }]}>Accept</ThemedText>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: '#ff3b30' }]}
                    onPress={() => handleRespond(invite.id, 'REJECT')}
                    disabled={respondMutation.isPending}
                  >
                    {respondMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <ThemedText style={[styles.smallBtnText, { color: '#ffffff' }]}>Reject</ThemedText>
                    )}
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>
      )}

      {/* 2. Available Workspaces Section */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Workspaces</ThemedText>
        <ThemedText type="default" style={styles.subtitle}>
          Select or create a workspace to begin organizing
        </ThemedText>
      </ThemedView>

      {workspaces.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <ThemedText type="smallBold">No Workspaces Found</ThemedText>
          <ThemedText type="default" style={styles.emptyText}>
            You aren't a member of any workspaces yet. Create one to get started!
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.list}>
          {workspaces.map((ws) => {
            const isSelected = currentWorkspace?.id === ws.id;
            return (
              <TouchableOpacity
                key={ws.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: isSelected ? theme.text : 'transparent',
                    borderWidth: 2,
                  },
                ]}
                onPress={() => handleSelect(ws)}
                activeOpacity={0.8}
              >
                <ThemedView style={styles.cardHeader}>
                  <ThemedText type="smallBold" style={styles.cardTitle}>{ws.name}</ThemedText>
                  <ThemedView style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="small" style={{ fontSize: 11 }}>{ws.role}</ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Wedding Date: {new Date(ws.wedding_date).toLocaleDateString()}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ThemedView>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.text, marginTop: Spacing.four }]}
        onPress={() => setShowCreateForm(true)}
      >
        <ThemedText style={[styles.buttonText, { color: theme.background }]}>
          + Create New Workspace
        </ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.four,
    gap: Spacing.four,
  },
  bannerImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: Spacing.one,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  header: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  subtitle: {
    opacity: 0.7,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 160,
  },
  emptyText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  list: {
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  form: {
    gap: Spacing.three,
  },
  inputWrapper: {
    gap: Spacing.one,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  invitesSection: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  sectionHeader: {
    fontSize: 16,
    color: '#E91E63',
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  smallBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
});
