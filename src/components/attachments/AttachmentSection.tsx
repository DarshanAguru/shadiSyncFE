import React, { useState } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
  View,
  Linking,
} from 'react-native';
import { useToastStore } from '@/stores/toastStore';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useUploadDocument } from '../../hooks/useDocuments';

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
  useCreateAttachment,
  useDeleteAttachment,
  AttachmentItem,
} from '../../hooks/useAttachments';
import { useFolders } from '../../hooks/useDocuments';

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
  const { data: foldersData, isLoading: foldersLoading } = useFolders(currentWorkspace?.id);

  const createAttachMutation = useCreateAttachment();
  const deleteAttachMutation = useDeleteAttachment(entityType, entityId);

  // States
  const [showSelectFlow, setShowSelectFlow] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const uploadDocMutation = useUploadDocument();

  const handleAttach = async () => {
    if (!selectedFolderId) {
      showToast('Selection Error', 'Please select a folder to attach', 'error');
      return;
    }

    try {
      await createAttachMutation.mutateAsync({
        folderId: selectedFolderId,
        entityType,
        entityId,
      });
      showToast('Success', 'Folder attached successfully', 'success');
      setSelectedFolderId('');
      setShowSelectFlow(false);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to attach folder', 'error');
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

  const handleUploadFiles = async () => {
    if (!currentWorkspace) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsUploading(true);

      for (const asset of result.assets) {
        const formData = new FormData();
        formData.append('workspaceId', currentWorkspace.id);

        if (Platform.OS === 'web') {
          if ((asset as any).file) {
            formData.append('file', (asset as any).file, asset.name);
          } else {
            const res = await fetch(asset.uri);
            const blob = await res.blob();
            formData.append('file', blob, asset.name);
          }
        } else {
          formData.append('file', {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || 'application/octet-stream',
          } as any);
        }

        const uploadRes = await uploadDocMutation.mutateAsync({
          workspaceId: currentWorkspace.id,
          formData,
        });

        await createAttachMutation.mutateAsync({
          documentId: uploadRes.document.id,
          entityType,
          entityId,
        });
      }

      showToast('Success', `Uploaded and attached ${result.assets.length} file(s) successfully!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Error', err.message || 'Failed to upload document(s)', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const attachments = attachmentsData?.attachments || [];
  const folders = foldersData?.folders || [];

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="smallBold" style={{ fontSize: 16 }}>Linked Folders & Files</ThemedText>
        {!readOnly && (
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <TouchableOpacity
              onPress={() => setShowSelectFlow(!showSelectFlow)}
              style={[styles.toggleBtn, { borderColor: theme.text }]}
            >
              <ThemedText style={{ fontSize: 12 }}>
                {showSelectFlow ? 'Close' : '+ Attach Folder'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleUploadFiles}
              disabled={isUploading}
              style={[styles.toggleBtn, { borderColor: theme.text }]}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <ThemedText style={{ fontSize: 12 }}>
                  + Upload Files
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>

      {showSelectFlow && (
        <ThemedView style={styles.selectFlow}>
          <ThemedText type="smallBold" style={styles.flowLabel}>Select Workspace Folder</ThemedText>

          {foldersLoading ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : folders.length === 0 ? (
            <ThemedView style={styles.emptyFlow}>
              <ThemedText type="small" style={{ opacity: 0.6, textAlign: 'center' }}>
                No folders registered in this workspace yet. Please create folders in the Documents tab first.
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={{ gap: Spacing.two }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docRow}>
                {folders.map((folder) => {
                  const isSelected = selectedFolderId === folder.id;
                  return (
                    <TouchableOpacity
                      key={folder.id}
                      style={[
                        styles.docCard,
                        {
                          borderColor: isSelected ? theme.text : 'transparent',
                          backgroundColor: isSelected ? 'rgba(233, 30, 99, 0.08)' : theme.background,
                        },
                      ]}
                      onPress={() => setSelectedFolderId(folder.id)}
                    >
                      <ThemedText type="smallBold" style={{ color: isSelected ? '#E91E63' : theme.text }}>
                        📁 {folder.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <ThemedView style={styles.flowActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.text, width: '100%' }]}
                  onPress={handleAttach}
                  disabled={createAttachMutation.isPending}
                >
                  {createAttachMutation.isPending ? (
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <ThemedText style={{ color: theme.background, fontWeight: 'bold', fontSize: 12 }}>
                      Link Selected Folder
                    </ThemedText>
                  )}
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
          No folders attached to this {entityType === 'TASK' ? 'task' : 'expense'}.
        </ThemedText>
      ) : (
        <ThemedView style={styles.list}>
          {attachments.map((att) => {
            const isFolder = !!att.folder_id;
            return (
              <ThemedView key={att.id} style={[styles.attachmentRow, { backgroundColor: theme.background }]}>
                <ThemedView style={{ flex: 1, gap: 1 }}>
                  {isFolder ? (
                    <>
                      <ThemedText type="smallBold">
                        📁 {att.folder_name}
                      </ThemedText>
                      <ThemedText type="small" style={{ fontSize: 10, opacity: 0.6 }}>
                        Type: Folder
                      </ThemedText>
                    </>
                  ) : (
                    <>
                      <ThemedText type="smallBold">
                        📄 {att.document_name?.includes('_') && !isNaN(Number(att.document_name.split('_')[0]))
                          ? att.document_name.slice(att.document_name.indexOf('_') + 1)
                          : att.document_name}
                      </ThemedText>
                      <ThemedText type="small" style={{ fontSize: 10, opacity: 0.6 }}>
                        Type: {att.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'} • {((att.file_size || 0) / 1024 / 1024).toFixed(2)} MB
                      </ThemedText>
                    </>
                  )}
                </ThemedView>

                <ThemedView style={{ flexDirection: 'row', gap: Spacing.two, alignItems: 'center', backgroundColor: 'transparent' }}>
                  {isFolder ? (
                    <TouchableOpacity
                      onPress={() => {
                        router.replace({
                          pathname: '/more',
                          params: { tab: 'DOCUMENTS', folderId: att.folder_id, folderName: att.folder_name }
                        });
                      }}
                      style={[styles.viewBtn, { borderColor: theme.border }]}
                    >
                      <ThemedText style={{ fontSize: 11, color: theme.text }}>Open Folder</ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={async () => {
                          const resolved = resolveFileUrl(att.file_url || '');
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

                      <TouchableOpacity
                        onPress={async () => {
                          const resolved = resolveFileUrl(att.file_url || '');
                          try {
                            await Linking.openURL(resolved);
                          } catch (err) {
                            showToast('Error', 'Could not start download', 'error');
                          }
                        }}
                        style={[styles.viewBtn, { borderColor: theme.border }]}
                      >
                        <ThemedText style={{ fontSize: 11, color: theme.text }}>Download</ThemedText>
                      </TouchableOpacity>
                    </>
                  )}

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
            );
          })}
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
    backgroundColor: 'transparent',
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
