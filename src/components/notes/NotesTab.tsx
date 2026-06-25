import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '@/stores/toastStore';

import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { PermissionGuard } from '../permissions/PermissionGuard';
import { hasPermission } from '@/utils/permissions';
import { safeFormatDate } from '@/utils/date';
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  NoteItem,
} from '../../hooks/useNotes';

export default function NotesTab() {
  const theme = useTheme();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const { showToast } = useToastStore();

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  
  // Form Inputs
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [noteType, setNoteType] = useState<'NOTE' | 'CHECKLIST'>('NOTE');

  // Queries
  const { data: notesData, isLoading, refetch } = useNotes(currentWorkspace?.id, searchQuery);

  // Mutations
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  const handleOpenCreate = () => {
    setEditNoteId(null);
    setTitle('');
    setContent('');
    setIsPinned(false);
    setNoteType('NOTE');
    setShowForm(true);
  };

  const handleOpenEdit = (note: NoteItem) => {
    setEditNoteId(note.id);
    setTitle(note.title);
    setIsPinned(note.is_pinned);
    
    if (note.content?.startsWith('[CHECKLIST]')) {
      setNoteType('CHECKLIST');
      // strip the [CHECKLIST] header
      const rawLines = note.content.split('\n').slice(1);
      // clean lines for user edit (removing [ ] or [x] markers)
      const userLines = rawLines.map(line => {
        if (line.startsWith('[ ]') || line.startsWith('[x]')) {
          return line.substring(3).trim();
        }
        return line;
      });
      setContent(userLines.join('\n'));
    } else {
      setNoteType('NOTE');
      setContent(note.content || '');
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!currentWorkspace) return;
    if (title.trim().length === 0) {
      showToast('Validation Error', 'Note title is required', 'error');
      return;
    }

    // Format content if checklist
    let finalContent = content.trim();
    if (noteType === 'CHECKLIST') {
      const processed = content.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('[ ]') || trimmed.startsWith('[x]')) return trimmed;
        return `[ ] ${trimmed}`;
      }).filter(Boolean).join('\n');
      finalContent = `[CHECKLIST]\n${processed}`;
    }

    try {
      if (editNoteId) {
        await updateMutation.mutateAsync({
          id: editNoteId,
          workspaceId: currentWorkspace.id,
          title: title.trim(),
          content: finalContent,
          isPinned,
        });
        showToast('Success', 'Note updated successfully', 'success');
      } else {
        await createMutation.mutateAsync({
          workspaceId: currentWorkspace.id,
          title: title.trim(),
          content: finalContent,
          isPinned,
        });
        showToast('Success', 'Note created successfully', 'success');
      }
      setShowForm(false);
      setTitle('');
      setContent('');
      setIsPinned(false);
      setEditNoteId(null);
      setNoteType('NOTE');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to save note', 'error');
    }
  };

  const handleToggleChecklistItem = async (note: NoteItem, lineIndex: number) => {
    if (!currentWorkspace) return;
    const lines = note.content.split('\n');
    const targetLine = lines[lineIndex];
    if (targetLine.startsWith('[ ]')) {
      lines[lineIndex] = targetLine.replace('[ ]', '[x]');
    } else if (targetLine.startsWith('[x]')) {
      lines[lineIndex] = targetLine.replace('[x]', '[ ]');
    } else {
      lines[lineIndex] = `[x] ${targetLine}`;
    }
    const newContent = lines.join('\n');
    try {
      await updateMutation.mutateAsync({
        id: note.id,
        workspaceId: currentWorkspace.id,
        title: note.title,
        content: newContent,
        isPinned: note.is_pinned,
      });
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to toggle item', 'error');
    }
  };

  const handleTogglePin = async (note: NoteItem) => {
    if (!currentWorkspace) return;
    try {
      await updateMutation.mutateAsync({
        id: note.id,
        workspaceId: currentWorkspace.id,
        title: note.title,
        content: note.content,
        isPinned: !note.is_pinned,
      });
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to update pin state', 'error');
    }
  };

  const handleCopyContent = async (note: NoteItem) => {
    if (!note.content) {
      showToast('Info', 'This note has no content to copy', 'info');
      return;
    }
    await Clipboard.setStringAsync(note.content);
    showToast('Copied', 'Note content copied to clipboard', 'success');
  };

  const handleDelete = async (note: NoteItem) => {
    if (!currentWorkspace) return;
    try {
      await deleteMutation.mutateAsync({
        id: note.id,
        workspaceId: currentWorkspace.id,
      });
      showToast('Success', 'Note deleted successfully', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to delete note', 'error');
    }
  };

  const notes = notesData?.notes || [];
  const canCreate = hasPermission(currentWorkspace?.role, 'Notes', 'create');

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.headerRow}>
        <ThemedText type="smallBold" style={{ fontSize: 18 }}>Workspace Notes</ThemedText>
        {canCreate && !showForm && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.text }]}
            onPress={handleOpenCreate}
          >
            <ThemedText style={{ color: theme.background, fontSize: 12, fontWeight: 'bold' }}>
              + Add Note
            </ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      {/* Form Card */}
      {showForm && (
        <ThemedView type="backgroundElement" style={styles.formCard}>
          <ThemedText type="smallBold">
            {editNoteId ? 'Edit Note' : 'New Note'}
          </ThemedText>

          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            placeholder="Note Title"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          {/* Note Type Selector */}
          <ThemedView style={{ flexDirection: 'row', gap: Spacing.two, marginVertical: Spacing.one }}>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                {
                  backgroundColor: noteType === 'NOTE' ? theme.text : theme.backgroundSelected,
                  borderColor: theme.border
                }
              ]}
              onPress={() => setNoteType('NOTE')}
            >
              <ThemedText style={{ color: noteType === 'NOTE' ? theme.background : theme.text, fontSize: 12, fontWeight: 'bold' }}>
                ✍️ Text Note
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                {
                  backgroundColor: noteType === 'CHECKLIST' ? theme.text : theme.backgroundSelected,
                  borderColor: theme.border
                }
              ]}
              onPress={() => setNoteType('CHECKLIST')}
            >
              <ThemedText style={{ color: noteType === 'CHECKLIST' ? theme.background : theme.text, fontSize: 12, fontWeight: 'bold' }}>
                ☑️ Checklist
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: theme.background, color: theme.text }]}
            placeholder={noteType === 'CHECKLIST' ? "Enter checklist items, one per line:\ne.g.\nBuy floral garlands\nCheck sound system\nConfirm caterers" : "Write note contents here..."}
            placeholderTextColor={theme.textSecondary}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.pinToggleRow}
            onPress={() => setIsPinned(!isPinned)}
          >
            <ThemedView style={[
              styles.checkbox,
              { borderColor: theme.text, backgroundColor: isPinned ? theme.text : 'transparent' }
            ]}>
              {isPinned && <ThemedText style={{ color: theme.background, fontSize: 10 }}>✓</ThemedText>}
            </ThemedView>
            <ThemedText style={{ fontSize: 13 }}>Pin Note to Top</ThemedText>
          </TouchableOpacity>

          <ThemedView style={{ flexDirection: 'row', gap: Spacing.two }}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.text, flex: 1 }]}
              onPress={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <ThemedText style={{ color: theme.background, fontWeight: 'bold', fontSize: 13 }}>
                  Save Note
                </ThemedText>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { borderWidth: 1, borderColor: theme.text, flex: 1 }]}
              onPress={() => setShowForm(false)}
            >
              <ThemedText style={{ color: theme.text, fontSize: 13 }}>Cancel</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      )}

      {/* Search Input */}
      {!showForm && (
        <ThemedView style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="🔍 Search title or content..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </ThemedView>
      )}

      {/* Notes Grid / List */}
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.text} />
      ) : notes.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <ThemedText style={{ fontSize: 24, marginBottom: 4 }}>📝</ThemedText>
          <ThemedText type="smallBold">No Notes Found</ThemedText>
          <ThemedText type="small" style={styles.placeholderText}>
            {searchQuery ? 'No notes match your search query.' : 'Create a note to remember ideas, checklist items, or schedules.'}
          </ThemedText>
        </ThemedView>
      ) : (
        <ScrollView contentContainerStyle={styles.notesList} showsVerticalScrollIndicator={false}>
          {notes.map((note) => (
            <ThemedView
              key={note.id}
              type="backgroundElement"
              style={[
                styles.noteCard,
                note.is_pinned && { borderWidth: 1.5, borderColor: '#E91E63' }
              ]}
            >
              <ThemedView style={styles.noteHeader}>
                <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                  {note.is_pinned && <ThemedText style={{ fontSize: 14 }}>📌</ThemedText>}
                  <ThemedText type="smallBold" style={{ fontSize: 16 }}>{note.title}</ThemedText>
                </ThemedView>
                <TouchableOpacity onPress={() => handleTogglePin(note)}>
                  <ThemedText style={{ fontSize: 16, opacity: note.is_pinned ? 1 : 0.3 }}>
                    {note.is_pinned ? '📌' : '📍'}
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>

              {note.content ? (
                note.content.startsWith('[CHECKLIST]') ? (
                  <ThemedView style={{ gap: Spacing.one, marginVertical: Spacing.one }}>
                    {note.content.split('\n').slice(1).map((line, idx) => {
                      if (!line.trim()) return null;
                      const isChecked = line.startsWith('[x]');
                      const text = (line.startsWith('[ ]') || line.startsWith('[x]'))
                        ? line.substring(3).trim()
                        : line.trim();

                      return (
                        <TouchableOpacity
                          key={idx}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 4 }}
                          onPress={() => handleToggleChecklistItem(note, idx + 1)}
                        >
                          <Ionicons
                            name={isChecked ? "checkbox" : "square-outline"}
                            size={18}
                            color={isChecked ? "#E91E63" : theme.textSecondary}
                          />
                          <ThemedText
                            style={{
                              fontSize: 14,
                              textDecorationLine: isChecked ? 'line-through' : 'none',
                              color: isChecked ? theme.textSecondary : theme.text
                            }}
                          >
                            {text}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </ThemedView>
                ) : (
                  <ThemedText type="default" style={styles.noteContent}>
                    {note.content}
                  </ThemedText>
                )
              ) : (
                <ThemedText type="small" style={{ opacity: 0.4, fontStyle: 'italic' }}>
                  No content.
                </ThemedText>
              )}

              <ThemedView style={styles.noteMeta}>
                <ThemedText type="small" style={styles.metaText}>
                  By {note.creator_name || 'System'} • {safeFormatDate(note.updated_at)}
                </ThemedText>

                <ThemedView style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleCopyContent(note)}
                  >
                    <ThemedText style={{ fontSize: 12, color: '#E91E63', fontWeight: 'bold' }}>Copy</ThemedText>
                  </TouchableOpacity>

                  <PermissionGuard module="Notes" action="edit">
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleOpenEdit(note)}
                    >
                      <ThemedText style={{ fontSize: 12, color: theme.text }}>Edit</ThemedText>
                    </TouchableOpacity>
                  </PermissionGuard>

                  <PermissionGuard module="Notes" action="delete">
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleDelete(note)}
                    >
                      <ThemedText style={{ fontSize: 12, color: '#ff3b30' }}>Delete</ThemedText>
                    </TouchableOpacity>
                  </PermissionGuard>
                </ThemedView>
              </ThemedView>
            </ThemedView>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 6,
  },
  formCard: {
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  input: {
    height: 36,
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  textArea: {
    height: 180,
    paddingTop: Spacing.two,
    textAlignVertical: 'top',
  },
  typeBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  pinToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    marginBottom: Spacing.one,
  },
  searchInput: {
    height: 38,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 160,
  },
  placeholderText: {
    opacity: 0.6,
    textAlign: 'center',
    fontSize: 12,
  },
  notesList: {
    gap: Spacing.three,
  },
  noteCard: {
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteContent: {
    fontSize: 14,
    opacity: 0.85,
    lineHeight: 20,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  metaText: {
    fontSize: 11,
    opacity: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionIconBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
});
