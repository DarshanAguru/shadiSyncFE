import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useToastStore } from '@/stores/toastStore';

import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, EventItem } from '../../hooks/useEventsAndCategories';
import { hasPermission } from '@/utils/permissions';
import { PermissionGuard } from '../permissions/PermissionGuard';
import { safeFormatDate } from '@/utils/date';

export default function EventsTab({ initialMode = 'LIST' }: { initialMode?: 'LIST' | 'CREATE' } = {}) {
  const theme = useTheme();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const { showToast } = useToastStore();

  const { data, isLoading, isError, refetch } = useEvents(currentWorkspace?.id);
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  // Mode States: 'LIST' | 'CREATE' | 'EDIT'
  const [mode, setMode] = useState<'LIST' | 'CREATE' | 'EDIT'>(initialMode);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('2026-10-18T12:00:00Z');
  const [endTime, setEndTime] = useState('2026-10-18T18:00:00Z');
  const [location, setLocation] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartTime('2026-10-18T12:00:00Z');
    setEndTime('2026-10-18T18:00:00Z');
    setLocation('');
    setSelectedEvent(null);
  };

  const handleCreate = async () => {
    if (!currentWorkspace) return;
    if (title.trim().length === 0) {
      showToast('Validation Error', 'Event title is required', 'error');
      return;
    }
    if (isNaN(Date.parse(startTime)) || isNaN(Date.parse(endTime))) {
      showToast('Validation Error', 'Please enter valid dates', 'error');
      return;
    }

    try {
      await createMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        title: title.trim(),
        description: description.trim() || undefined,
        startTime,
        endTime,
        location: location.trim() || undefined,
      });
      showToast('Success', 'Event created successfully', 'success');
      setMode('LIST');
      resetForm();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to create event', 'error');
    }
  };

  const handleEdit = (event: EventItem) => {
    setSelectedEvent(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setStartTime(event.start_time);
    setEndTime(event.end_time);
    setLocation(event.location || '');
    setMode('EDIT');
  };

  const handleUpdate = async () => {
    if (!currentWorkspace || !selectedEvent) return;
    if (title.trim().length === 0) {
      showToast('Validation Error', 'Event title is required', 'error');
      return;
    }
    if (isNaN(Date.parse(startTime)) || isNaN(Date.parse(endTime))) {
      showToast('Validation Error', 'Please enter valid dates', 'error');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedEvent.id,
        workspaceId: currentWorkspace.id,
        title: title.trim(),
        description: description.trim() || undefined,
        startTime,
        endTime,
        location: location.trim() || undefined,
      });
      showToast('Success', 'Event updated successfully', 'success');
      setMode('LIST');
      resetForm();
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update event', 'error');
    }
  };

  const handleDelete = async (event: EventItem) => {
    if (!currentWorkspace) return;
    try {
      await deleteMutation.mutateAsync({
        id: event.id,
        workspaceId: currentWorkspace.id,
      });
      showToast('Success', 'Event deleted successfully', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to delete event', 'error');
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
        <ThemedText>Error loading events.</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <ThemedText style={{ color: theme.background }}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const events = data?.events || [];
  const canCreate = hasPermission(currentWorkspace?.role, 'Events', 'create');

  if (mode === 'CREATE' || mode === 'EDIT') {
    const isEditing = mode === 'EDIT';
    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
      <ScrollView contentContainerStyle={styles.formContainer}>
        <ThemedText type="smallBold" style={styles.formTitle}>
          {isEditing ? 'Edit Event' : 'Create Event'}
        </ThemedText>

        <ThemedView style={styles.form}>
          <ThemedView style={styles.inputWrapper}>
            <ThemedText type="smallBold">Title</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Reception Dinner"
              placeholderTextColor={theme.textSecondary}
            />
          </ThemedView>

          <ThemedView style={styles.inputWrapper}>
            <ThemedText type="smallBold">Description</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Provide a short details about the event..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />
          </ThemedView>

          <ThemedView style={styles.inputWrapper}>
            <ThemedText type="smallBold">Start Time (ISO String)</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="e.g. 2026-10-18T12:00:00Z"
              placeholderTextColor={theme.textSecondary}
            />
          </ThemedView>

          <ThemedView style={styles.inputWrapper}>
            <ThemedText type="smallBold">End Time (ISO String)</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="e.g. 2026-10-18T18:00:00Z"
              placeholderTextColor={theme.textSecondary}
            />
          </ThemedView>

          <ThemedView style={styles.inputWrapper}>
            <ThemedText type="smallBold">Location</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Grand Ballroom"
              placeholderTextColor={theme.textSecondary}
            />
          </ThemedView>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.text }]}
            onPress={isEditing ? handleUpdate : handleCreate}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText style={{ color: theme.background, fontWeight: 'bold' }}>
                {isEditing ? 'Save Changes' : 'Create Event'}
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setMode('LIST');
              resetForm();
            }}
          >
            <ThemedText style={{ color: theme.textSecondary }}>Cancel</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.listContainer}>
      <ThemedView style={styles.sectionHeader}>
        <ThemedText type="smallBold" style={{ fontSize: 18 }}>Wedding Timeline</ThemedText>
        {canCreate && (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: theme.text }]}
            onPress={() => setMode('CREATE')}
          >
            <ThemedText style={{ color: theme.background, fontWeight: 'bold', fontSize: 13 }}>
              + Add Event
            </ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      {events.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <ThemedText type="smallBold">No Events Scheduled</ThemedText>
          <ThemedText type="default" style={styles.emptyText}>
            Begin building your wedding itinerary by creating your first event!
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.list}>
          {events.map((event) => (
            <ThemedView key={event.id} type="backgroundElement" style={styles.card}>
              <ThemedView style={styles.cardHeader}>
                <ThemedView style={{ flex: 1 }}>
                  <ThemedText type="smallBold" style={styles.cardTitle}>{event.title}</ThemedText>
                  {event.location && (
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      📍 {event.location}
                    </ThemedText>
                  )}
                </ThemedView>
                <ThemedText type="small" style={{ color: '#E91E63', fontWeight: 'bold' }}>
                  {safeFormatDate(event.start_time, { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
              </ThemedView>

              {event.description && (
                <ThemedText type="small" style={styles.cardDesc}>
                  {event.description}
                </ThemedText>
              )}

              <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>
                Date: {safeFormatDate(event.start_time)}
              </ThemedText>

              {/* Edit/Delete Actions */}
              <ThemedView style={styles.cardActions}>
                <PermissionGuard module="Events" action="edit">
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: theme.text }]}
                    onPress={() => handleEdit(event)}
                  >
                    <ThemedText style={{ fontSize: 12 }}>Edit</ThemedText>
                  </TouchableOpacity>
                </PermissionGuard>
                <PermissionGuard module="Events" action="delete">
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#ff3b30' }]}
                    onPress={() => handleDelete(event)}
                  >
                    <ThemedText style={{ fontSize: 12, color: '#ff3b30' }}>Delete</ThemedText>
                  </TouchableOpacity>
                </PermissionGuard>
              </ThemedView>
            </ThemedView>
          ))}
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  listContainer: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  createBtn: {
    height: 32,
    paddingHorizontal: Spacing.three,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 120,
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
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
  },
  cardDesc: {
    opacity: 0.7,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  formContainer: {
    gap: Spacing.three,
  },
  formTitle: {
    fontSize: 18,
  },
  form: {
    gap: Spacing.three,
  },
  inputWrapper: {
    gap: Spacing.one,
  },
  input: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 15,
  },
  textArea: {
    height: 72,
    paddingTop: Spacing.two,
  },
  submitBtn: {
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
