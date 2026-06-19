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
import { useCategories, useCreateCategory, useDeleteCategory, useEvents } from '../../hooks/useEventsAndCategories';
import { hasPermission } from '@/utils/permissions';
import { PermissionGuard } from '../permissions/PermissionGuard';

export default function CategoriesTab() {
  const theme = useTheme();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const { showToast } = useToastStore();

  const { data: catData, isLoading: catLoading, isError: catError, refetch: refetchCats } = useCategories(currentWorkspace?.id);
  const { data: eventsData } = useEvents(currentWorkspace?.id);
  const createMutation = useCreateCategory();
  const deleteMutation = useDeleteCategory();

  // Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>(''); // empty means no event

  const handleCreate = async () => {
    if (!currentWorkspace) return;
    if (name.trim().length === 0) {
      showToast('Validation Error', 'Category name is required', 'error');
      return;
    }

    try {
      await createMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        name: name.trim(),
        eventId: selectedEventId || undefined,
      });
      showToast('Success', 'Category added successfully', 'success');
      setName('');
      setSelectedEventId('');
      setShowAddForm(false);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to add category', 'error');
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!currentWorkspace) return;
    try {
      await deleteMutation.mutateAsync({
        id,
        workspaceId: currentWorkspace.id,
      });
      showToast('Success', 'Category deleted successfully', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to delete category', 'error');
    }
  };

  if (catLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.text} />
      </ThemedView>
    );
  }

  if (catError) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Error loading categories.</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetchCats()}>
          <ThemedText style={{ color: theme.background }}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const categories = catData?.categories || [];
  const events = eventsData?.events || [];
  const canCreate = hasPermission(currentWorkspace?.role, 'Events', 'create');

  if (showAddForm) {
    return (
      <ScrollView contentContainerStyle={styles.formContainer}>
        <ThemedText type="smallBold" style={styles.formTitle}>Add Category</ThemedText>

        <ThemedView style={styles.form}>
          <ThemedView style={styles.inputWrapper}>
            <ThemedText type="smallBold">Category Name</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Florist, Catering, Photography"
              placeholderTextColor={theme.textSecondary}
            />
          </ThemedView>

          {/* Event selector */}
          <ThemedView style={styles.inputWrapper}>
            <ThemedText type="smallBold">Link to Event (Optional)</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.6, marginBottom: 4 }}>
              Connecting a category to an event simplifies task and vendor assignment.
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventRow}>
              <TouchableOpacity
                style={[
                  styles.eventSelectBtn,
                  {
                    backgroundColor: selectedEventId === '' ? theme.text : theme.backgroundElement,
                  },
                ]}
                onPress={() => setSelectedEventId('')}
              >
                <ThemedText style={{ color: selectedEventId === '' ? theme.background : theme.text, fontSize: 13 }}>
                  None (General Workspace)
                </ThemedText>
              </TouchableOpacity>
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.eventSelectBtn,
                    {
                      backgroundColor: selectedEventId === event.id ? theme.text : theme.backgroundElement,
                    },
                  ]}
                  onPress={() => setSelectedEventId(event.id)}
                >
                  <ThemedText style={{ color: selectedEventId === event.id ? theme.background : theme.text, fontSize: 13 }}>
                    {event.title}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.text }]}
            onPress={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText style={{ color: theme.background, fontWeight: 'bold' }}>
                Add Category
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setShowAddForm(false);
              setName('');
              setSelectedEventId('');
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
        <ThemedText type="smallBold" style={{ fontSize: 18 }}>Categories</ThemedText>
        {canCreate && (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: theme.text }]}
            onPress={() => setShowAddForm(true)}
          >
            <ThemedText style={{ color: theme.background, fontWeight: 'bold', fontSize: 13 }}>
              + Add Category
            </ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      {categories.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <ThemedText type="smallBold">No Categories Added</ThemedText>
          <ThemedText type="default" style={styles.emptyText}>
            Categories help group expenses and tasks. Add one to begin organizing!
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.list}>
          {categories.map((cat) => (
            <ThemedView key={cat.id} type="backgroundElement" style={styles.card}>
              <ThemedView style={styles.cardContent}>
                <ThemedView style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="smallBold" style={styles.cardTitle}>{cat.name}</ThemedText>
                  {cat.event_title ? (
                    <ThemedText type="small" style={{ color: '#E91E63', fontSize: 12 }}>
                      Bound Event: {cat.event_title}
                    </ThemedText>
                  ) : (
                    <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>
                      General Category
                    </ThemedText>
                  )}
                </ThemedView>

                <PermissionGuard module="Events" action="delete">
                  <TouchableOpacity
                    style={[styles.deleteBtn, { borderColor: '#ff3b30' }]}
                    onPress={() => handleDelete(cat.id, cat.name)}
                  >
                    <ThemedText style={{ color: '#ff3b30', fontSize: 12 }}>Delete</ThemedText>
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
    gap: Spacing.two,
  },
  card: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
  },
  deleteBtn: {
    paddingHorizontal: Spacing.two,
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
  eventRow: {
    gap: Spacing.two,
    paddingVertical: 4,
  },
  eventSelectBtn: {
    paddingHorizontal: Spacing.three,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
