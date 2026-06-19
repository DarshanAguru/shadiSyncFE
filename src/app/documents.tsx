import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  View,
} from 'react-native';
import { useToastStore } from '@/stores/toastStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';

const resolveFileUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const host = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace('/api', '');
  return `${host}${url}`;
};

const getFileIconName = (mimeType: string): any => {
  const type = (mimeType || '').toLowerCase();
  if (type.includes('image')) return 'image';
  if (type.includes('pdf')) return 'document-text';
  if (type.includes('word') || type.includes('officedocument')) return 'document';
  return 'file-tray-full';
};

const getFileIconColor = (mimeType: string): string => {
  const type = (mimeType || '').toLowerCase();
  if (type.includes('image')) return '#FF9800'; // Orange
  if (type.includes('pdf')) return '#F44336'; // Red
  if (type.includes('word') || type.includes('officedocument')) return '#2196F3'; // Blue
  return '#757575'; // Grey
};

const getFileIconBg = (mimeType: string): string => {
  const type = (mimeType || '').toLowerCase();
  if (type.includes('image')) return 'rgba(255, 152, 0, 0.08)';
  if (type.includes('pdf')) return 'rgba(244, 67, 54, 0.08)';
  if (type.includes('word') || type.includes('officedocument')) return 'rgba(33, 150, 243, 0.08)';
  return 'rgba(117, 117, 117, 0.08)';
};
import { ThemedView } from '@/components/themed-view';
import { WorkspaceGuard } from '@/components/workspaces/WorkspaceGuard';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { hasPermission } from '@/utils/permissions';
import {
  useFolders,
  useCreateFolder,
  useDocumentsList,
  useUploadDocument,
  FolderItem,
} from '@/hooks/useDocuments';

export default function DocumentsScreen({ nested = false }: { nested?: boolean } = {}) {
  const theme = useTheme();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const { showToast } = useToastStore();

  // Browse state: 'root' or folder UUID
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [currentFolderName, setCurrentFolderName] = useState<string>('');

  // UI state
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const { data: foldersData, isLoading: foldersLoading, refetch: refetchFolders } = useFolders(currentWorkspace?.id);
  const { data: docsData, isLoading: docsLoading, refetch: refetchDocs } = useDocumentsList(
    currentWorkspace?.id,
    currentFolderId
  );

  // Mutations
  const createFolderMutation = useCreateFolder();
  const uploadDocMutation = useUploadDocument();

  // Create folder handler
  const handleCreateFolder = async () => {
    if (!currentWorkspace) return;
    if (folderName.trim().length === 0) {
      showToast('Validation Error', 'Folder name is required', 'error');
      return;
    }

    try {
      await createFolderMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        name: folderName.trim(),
      });
      showToast('Success', 'Folder created successfully', 'success');
      setFolderName('');
      setShowFolderForm(false);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to create folder', 'error');
    }
  };

  // Upload Document Picker handler
  const handleUploadFile = async () => {
    if (!currentWorkspace) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setIsUploading(true);

      const formData = new FormData();
      formData.append('workspaceId', currentWorkspace.id);
      
      if (currentFolderId !== 'root') {
        formData.append('folderId', currentFolderId);
      }

      // Platform conditional file appending for React Native vs Web
      if (Platform.OS === 'web' && (asset as any).file) {
        formData.append('file', (asset as any).file, asset.name);
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        } as any);
      }

      await uploadDocMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        folderId: currentFolderId === 'root' ? undefined : currentFolderId,
        formData,
      });

      showToast('Success', `${asset.name} uploaded successfully!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Error', err.message || 'Failed to upload document', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Seeding Mock files for easy sandbox review
  const handleMockUpload = async () => {
    if (!currentWorkspace) return;

    const samples = [
      { name: 'catering_menu.pdf', type: 'application/pdf', size: 1258291, uri: 'https://example.com/catering_menu.pdf' },
      { name: 'venue_blueprint.png', type: 'image/png', size: 3145728, uri: 'https://example.com/venue_blueprint.png' },
      { name: 'photographer_contract.pdf', type: 'application/pdf', size: 838860, uri: 'https://example.com/photographer_contract.pdf' },
      { name: 'dj_playlist_v2.pdf', type: 'application/pdf', size: 450200, uri: 'https://example.com/dj_playlist_v2.pdf' },
    ];
    const pick = samples[Math.floor(Math.random() * samples.length)];

    setIsUploading(true);

    try {
      // In a dev environment where formData can be mocked, we can append standard details
      const formData = new FormData();
      formData.append('workspaceId', currentWorkspace.id);
      if (currentFolderId !== 'root') {
        formData.append('folderId', currentFolderId);
      }

      // Convert external sample URL to a Blob
      const response = await fetch(pick.uri);
      const blob = await response.blob();
      const mockFileName = `${Date.now().toString().slice(-4)}_${pick.name}`;
      formData.append('file', blob, mockFileName);

      await uploadDocMutation.mutateAsync({
        workspaceId: currentWorkspace.id,
        folderId: currentFolderId === 'root' ? undefined : currentFolderId,
        formData,
      });

      showToast('Success', `Mock document "${mockFileName}" generated in folder!`, 'success');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to generate mock document', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFolderClick = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setCurrentFolderName(folder.name);
  };

  const handleBackToRoot = () => {
    setCurrentFolderId('root');
    setCurrentFolderName('');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const folders = foldersData?.folders || [];
  const documents = docsData?.documents || [];
  const canCreate = hasPermission(currentWorkspace?.role, 'Documents', 'create');

  const ContainerView = nested ? View : SafeAreaView;

  return (
    <ThemedView style={styles.container}>
      <ContainerView style={styles.safeArea}>
        <WorkspaceGuard currentWorkspace={currentWorkspace}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Header section */}
            {!nested ? (
              <ThemedView style={styles.header}>
                <ThemedView>
                  <ThemedText type="title">Documents</ThemedText>
                  <ThemedText type="default" style={styles.subtitle}>
                    Browse folders, contracts, blueprints, and proposals
                  </ThemedText>
                </ThemedView>

                {canCreate && (
                  <ThemedView style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.text }]}
                      onPress={() => setShowFolderForm(!showFolderForm)}
                    >
                      <ThemedText style={{ color: theme.background, fontSize: 12, fontWeight: 'bold' }}>
                        📁 + Folder
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.text }]}
                      onPress={handleUploadFile}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <ActivityIndicator color={theme.background} size="small" />
                      ) : (
                        <ThemedText style={{ color: theme.background, fontSize: 12, fontWeight: 'bold' }}>
                          📄 + Upload File
                        </ThemedText>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.text }]}
                      onPress={handleMockUpload}
                      disabled={isUploading}
                    >
                      <ThemedText style={{ color: theme.text, fontSize: 12 }}>
                        🧪 + Mock
                      </ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                )}
              </ThemedView>
            ) : (
              canCreate && (
                <ThemedView style={[styles.actionsRow, { paddingHorizontal: Spacing.three, marginBottom: Spacing.two }]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.text }]}
                    onPress={() => setShowFolderForm(!showFolderForm)}
                  >
                    <ThemedText style={{ color: theme.background, fontSize: 12, fontWeight: 'bold' }}>
                      📁 + Folder
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.text }]}
                    onPress={handleUploadFile}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <ActivityIndicator color={theme.background} size="small" />
                    ) : (
                      <ThemedText style={{ color: theme.background, fontSize: 12, fontWeight: 'bold' }}>
                        📄 + Upload File
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </ThemedView>
              )
            )}

            {/* Folder creation form */}
            {showFolderForm && (
              <ThemedView type="backgroundElement" style={styles.formCard}>
                <ThemedText type="smallBold">Create New Folder</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                  placeholder="e.g. Caterer Proposals"
                  placeholderTextColor={theme.textSecondary}
                  value={folderName}
                  onChangeText={setFolderName}
                />
                <ThemedView style={{ flexDirection: 'row', gap: Spacing.two }}>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.text, flex: 1 }]}
                    onPress={handleCreateFolder}
                    disabled={createFolderMutation.isPending}
                  >
                    {createFolderMutation.isPending ? (
                      <ActivityIndicator color={theme.background} />
                    ) : (
                      <ThemedText style={{ color: theme.background, fontWeight: 'bold', fontSize: 13 }}>
                        Create Folder
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, { borderWidth: 1, borderColor: theme.text, flex: 1 }]}
                    onPress={() => setShowFolderForm(false)}
                  >
                    <ThemedText style={{ color: theme.text, fontSize: 13 }}>Cancel</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </ThemedView>
            )}

            {/* Navigation / Breadcrumb track */}
            {currentFolderId !== 'root' && (
              <ThemedView style={styles.breadcrumbRow}>
                <TouchableOpacity onPress={handleBackToRoot}>
                  <ThemedText style={{ color: '#E91E63', fontWeight: 'bold' }}>🏠 Root</ThemedText>
                </TouchableOpacity>
                <ThemedText style={{ opacity: 0.5 }}> &gt; </ThemedText>
                <ThemedText type="smallBold" style={{ textDecorationLine: 'underline' }}>
                  📁 {currentFolderName}
                </ThemedText>
              </ThemedView>
            )}

            {/* Folder browser list (only shown at root level or if folders are flat) */}
            {currentFolderId === 'root' && (
              <ThemedView style={styles.section}>
                <ThemedText type="smallBold">Folders</ThemedText>
                {foldersLoading ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : folders.length === 0 ? (
                  <ThemedText type="small" style={styles.emptyText}>No folders created yet.</ThemedText>
                ) : (
                  <ThemedView style={styles.folderGrid}>
                    {folders.map((folder) => (
                      <TouchableOpacity
                        key={folder.id}
                        style={[styles.folderCard, { backgroundColor: theme.backgroundElement }]}
                        onPress={() => handleFolderClick(folder)}
                      >
                        <Ionicons name="folder" size={32} color="#E91E63" style={{ marginBottom: 4 }} />
                        <ThemedText type="smallBold" style={styles.folderCardName} numberOfLines={2}>
                          {folder.name}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ThemedView>
                )}
              </ThemedView>
            )}

            {/* Document listings */}
            <ThemedView style={styles.section}>
              <ThemedText type="smallBold">
                {currentFolderId === 'root' ? 'Root Files' : 'Files inside folder'}
              </ThemedText>

              {docsLoading ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : documents.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.emptyCard}>
                  <Ionicons name="folder-open-outline" size={44} color={theme.textSecondary} style={{ marginBottom: 6 }} />
                  <ThemedText type="smallBold">Directory is Empty</ThemedText>
                  <ThemedText type="small" style={styles.placeholderText}>
                    No documents found in this directory. Upload files or select mock templates to populate files.
                  </ThemedText>
                </ThemedView>
              ) : (
                <ThemedView style={styles.docList}>
                  {documents.map((doc) => (
                    <ThemedView key={doc.id} type="backgroundElement" style={styles.docRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 }}>
                        <View style={[styles.docIconBg, { backgroundColor: getFileIconBg(doc.mime_type) }]}>
                          <Ionicons name={getFileIconName(doc.mime_type)} size={18} color={getFileIconColor(doc.mime_type)} />
                        </View>
                        <ThemedView style={{ flex: 1, gap: 2 }}>
                          <ThemedText type="smallBold" numberOfLines={1}>
                            {doc.name.includes('_') && !isNaN(Number(doc.name.split('_')[0])) 
                              ? doc.name.slice(doc.name.indexOf('_') + 1)
                              : doc.name}
                          </ThemedText>
                          <ThemedView style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                            <ThemedView style={styles.mimeBadge}>
                              <ThemedText style={{ fontSize: 9, color: '#ffffff', fontWeight: 'bold' }}>
                                {doc.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                              </ThemedText>
                            </ThemedView>
                            <ThemedText type="small" style={styles.docMetaText}>
                              {formatSize(doc.file_size)} • By {doc.uploader_name || 'System'}
                            </ThemedText>
                          </ThemedView>
                        </ThemedView>
                      </View>

                      <TouchableOpacity
                        style={[styles.viewBtn, { borderColor: theme.border }]}
                        onPress={async () => {
                          const resolved = resolveFileUrl(doc.file_url);
                          try {
                            await WebBrowser.openBrowserAsync(resolved);
                          } catch (err) {
                            showToast('Error', 'Could not open document link', 'error');
                          }
                        }}
                      >
                        <ThemedText style={{ fontSize: 11, color: theme.text }}>View</ThemedText>
                      </TouchableOpacity>
                    </ThemedView>
                  ))}
                </ThemedView>
              )}
            </ThemedView>

          </ScrollView>
          {canCreate && (
            <TouchableOpacity
              style={[styles.fabButton, { backgroundColor: '#E91E63' }]}
              onPress={handleUploadFile}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="document-attach" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
        </WorkspaceGuard>
      </ContainerView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
  },
  scrollContent: {
    paddingVertical: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  subtitle: {
    opacity: 0.7,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
  btn: {
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  emptyText: {
    opacity: 0.6,
    fontSize: 13,
  },
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  folderCard: {
    width: '47%',
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 100,
    justifyContent: 'center',
  },
  folderCardName: {
    fontSize: 13,
    textAlign: 'center',
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
  docList: {
    gap: Spacing.two,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 8,
  },
  docIconBg: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mimeBadge: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  docMetaText: {
    fontSize: 11,
    opacity: 0.6,
  },
  viewBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  fabButton: {
    position: 'absolute',
    bottom: Spacing.four + 64,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 999,
  },
});
