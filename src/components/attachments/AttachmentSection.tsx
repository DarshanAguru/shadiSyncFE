import React, { useState } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useToastStore } from '@/stores/toastStore';
import * as WebBrowser from 'expo-web-browser';

import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const resolveFileUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const host = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace('/api', '');
  return `${host}${url}`;
};
import { useWorkspaceStore } from '@/stores/workspaceStore';
import {
  useAttachments,
  useWorkspaceDocuments,
  useCreateDocument,
  useCreateAttachment,
  useDeleteAttachment,
  AttachmentItem,
} from '../../hooks/useAttachments';
import { useFolders, useCreateFolder } from '../../hooks/useDocuments';

interface AttachmentSectionProps {
  entityType: 'EXPENSE' | 'TASK' | 'NOTE' | 'EVENT';
  entityId: string;
  readOnly?: boolean;
  eventTitle?: string;
  categoryName?: string;
}

export default function AttachmentSection({
  entityType,
  entityId,
  readOnly = false,
  eventTitle,
  categoryName,
}: AttachmentSectionProps) {
  const theme = useTheme();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const { showToast } = useToastStore();

  const { data: attachmentsData, isLoading: attLoading } = useAttachments(entityType, entityId);
  const { data: docsData, isLoading: docsLoading } = useWorkspaceDocuments(currentWorkspace?.id);
  const { data: foldersData } = useFolders(currentWorkspace?.id);

  const createDocMutation = useCreateDocument();
  const createFolderMutation = useCreateFolder();
  const createAttachMutation = useCreateAttachment();
  const deleteAttachMutation = useDeleteAttachment(entityType, entityId);

  // States
  const [showSelectFlow, setShowSelectFlow] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');

  // Handle seeding mock document so user has assets to select
  const handleSeedMockDoc = async () => {
    if (!currentWorkspace) return;
    const mockFiles = [
      { name: 'caterer_invoice.pdf', mime: 'application/pdf', size: 1048576, url: 'https://example.com/files/caterer_invoice.pdf' },
      { name: 'reception_layout.png', mime: 'image/png', size: 2097152, url: 'https://example.com/files/reception_layout.png' },
      { name: 'florist_agreement.pdf', mime: 'application/pdf', size: 524288, url: 'https://example.com/files/florist_agreement.pdf' },
    ];
    const pick = mockFiles[Math.floor(Math.random() * mockFiles.length)];

    try {
      // Determine target folder name based on linked event/category
      let folderName = '';
      if (eventTitle && categoryName) {
        folderName = `${eventTitle} - ${categoryName}`;
      } else if (eventTitle) {
        folderName = eventTitle;
      } else if (categoryName) {
        folderName = categoryName;
      }

      let targetFolderId: string | undefined = undefined;

      if (folderName) {
        const existingFolder = foldersData?.folders?.find(
          (f) => f.name.toLowerCase() === folderName.toLowerCase()
        );
        if (existingFolder) {
          targetFolderId = existingFolder.id;
        } else {
          const newFolder = await createFolderMutation.mutateAsync({
            workspaceId: currentWorkspace.id,
            name: folderName,
          });
          targetFolderId = newFolder.folder.id;
        }
      }

      await createDocMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        name: `${Date.now().toString().slice(-4)}_${pick.name}`,
        fileUrl: pick.url,
        fileSize: pick.size,
        mimeType: pick.mime,
        folderId: targetFolderId,
      });
      showToast('Success', 'Mock document uploaded successfully', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to mock upload document', 'error');
    }
  };

  const handleAttach = async () => {
    if (!selectedDocId) {
      showToast('Selection Error', 'Please select a document to attach', 'error');
      return;
    }

    try {
      await createAttachMutation.mutateAsync({
        documentId: selectedDocId,
        entityType,
        entityId,
      });
      showToast('Success', 'Document attached successfully', 'success');
      setSelectedDocId('');
      setShowSelectFlow(false);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to attach document', 'error');
    }
  };

  const handleRemoveAttachment = async (attachment: AttachmentItem) => {
    try {
      await deleteAttachMutation.mutateAsync({ id: attachment.id });
      showToast('Success', 'Attachment unlinked successfully', 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to unlink attachment', 'error');
    }
  };

  const attachments = attachmentsData?.attachments || [];
  const documents = docsData?.documents || [];

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="smallBold" style={{ fontSize: 16 }}>Linked Attachments</ThemedText>
        {!readOnly && (
          <TouchableOpacity
            onPress={() => setShowSelectFlow(!showSelectFlow)}
            style={[styles.toggleBtn, { borderColor: theme.text }]}
          >
            <ThemedText style={{ fontSize: 12 }}>
              {showSelectFlow ? 'Close' : '+ Attach Document'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>

      {showSelectFlow && (
        <ThemedView style={styles.selectFlow}>
          <ThemedText type="smallBold" style={styles.flowLabel}>Select Workspace Document</ThemedText>

          {docsLoading ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : documents.length === 0 ? (
            <ThemedView style={styles.emptyFlow}>
              <ThemedText type="small" style={{ opacity: 0.6, textAlign: 'center' }}>
                No documents registered in this workspace yet. Upload a sample document to test the linkage!
              </ThemedText>
              <TouchableOpacity
                style={[styles.seedBtn, { backgroundColor: theme.text }]}
                onPress={handleSeedMockDoc}
                disabled={createDocMutation.isPending}
              >
                {createDocMutation.isPending ? (
                  <ActivityIndicator color={theme.background} size="small" />
                ) : (
                  <ThemedText style={{ color: theme.background, fontWeight: 'bold', fontSize: 12 }}>
                    Upload Mock File
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ThemedView>
          ) : (
            <ThemedView style={{ gap: Spacing.two }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docRow}>
                {documents.map((doc) => {
                  const isSelected = selectedDocId === doc.id;
                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={[
                        styles.docCard,
                        {
                          borderColor: isSelected ? theme.text : 'transparent',
                          backgroundColor: isSelected ? 'rgba(233, 30, 99, 0.08)' : theme.background,
                        },
                      ]}
                      onPress={() => setSelectedDocId(doc.id)}
                    >
                      <ThemedText type="smallBold" style={{ color: isSelected ? '#E91E63' : theme.text }}>
                        📄 {doc.name.slice(5)}
                      </ThemedText>
                      <ThemedText type="small" style={{ fontSize: 10, opacity: 0.6 }}>
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <ThemedView style={styles.flowActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.text }]}
                  onPress={handleAttach}
                  disabled={createAttachMutation.isPending}
                >
                  {createAttachMutation.isPending ? (
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <ThemedText style={{ color: theme.background, fontWeight: 'bold', fontSize: 12 }}>
                      Link Selected Document
                    </ThemedText>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.text }]}
                  onPress={handleSeedMockDoc}
                  disabled={createDocMutation.isPending}
                >
                  <ThemedText style={{ color: theme.text, fontSize: 12 }}>
                    Add Another Mock File
                  </ThemedText>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>
      )}

      {attLoading ? (
        <ActivityIndicator size="small" color={theme.text} />
      ) : attachments.length === 0 ? (
        <ThemedText type="small" style={styles.emptyText}>
          No documents attached to this entity.
        </ThemedText>
      ) : (
        <ThemedView style={styles.list}>
          {attachments.map((att) => (
            <ThemedView key={att.id} style={[styles.attachmentRow, { backgroundColor: theme.background }]}>
              <ThemedView style={{ flex: 1, gap: 1 }}>
                <ThemedText type="smallBold">
                  📄 {att.document_name.includes('_') && !isNaN(Number(att.document_name.split('_')[0]))
                    ? att.document_name.slice(att.document_name.indexOf('_') + 1)
                    : att.document_name}
                </ThemedText>
                <ThemedText type="small" style={{ fontSize: 10, opacity: 0.6 }}>
                  Type: {att.mime_type.split('/')[1]?.toUpperCase() || 'FILE'} • {(att.file_size / 1024 / 1024).toFixed(2)} MB
                </ThemedText>
              </ThemedView>

              <ThemedView style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center', backgroundColor: 'transparent' }}>
                <TouchableOpacity
                  onPress={async () => {
                    const resolved = resolveFileUrl(att.file_url);
                    try {
                      await WebBrowser.openBrowserAsync(resolved);
                    } catch (err) {
                      showToast('Error', 'Could not open document link', 'error');
                    }
                  }}
                  style={[styles.viewBtn, { borderColor: theme.border }]}
                >
                  <ThemedText style={{ fontSize: 11, color: theme.text }}>View</ThemedText>
                </TouchableOpacity>

                {!readOnly && (
                  <TouchableOpacity
                    onPress={() => handleRemoveAttachment(att)}
                    style={styles.removeBtn}
                  >
                    <ThemedText style={{ color: '#ff3b30', fontSize: 11, fontWeight: 'bold' }}>Unlink</ThemedText>
                  </TouchableOpacity>
                )}
              </ThemedView>
            </ThemedView>
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  selectFlow: {
    padding: Spacing.three,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    gap: Spacing.two,
  },
  flowLabel: {
    fontSize: 13,
  },
  emptyFlow: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  seedBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 4,
  },
  docRow: {
    gap: Spacing.two,
    paddingVertical: 4,
  },
  docCard: {
    padding: Spacing.two,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  flowActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionBtn: {
    flex: 1,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    opacity: 0.6,
    fontSize: 13,
  },
  list: {
    gap: Spacing.two,
  },
  attachmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 6,
  },
  removeBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  viewBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
});
