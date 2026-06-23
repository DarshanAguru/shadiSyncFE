import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, apiUploadRequest } from '../utils/api';
import { DocumentItem } from './useAttachments';


export interface FolderItem {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
}

interface FetchFoldersResponse {
  folders: FolderItem[];
}

interface FetchDocumentsResponse {
  documents: DocumentItem[];
}

/**
 * Hook to retrieve folders in a workspace.
 */
export function useFolders(workspaceId: string | undefined) {
  return useQuery<FetchFoldersResponse, Error>({
    queryKey: ['folders', workspaceId],
    queryFn: () => apiRequest<FetchFoldersResponse>(`/folders?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to create a folder.
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation<
    { folder: FolderItem },
    Error,
    { workspaceId: string; name: string }
  >({
    mutationFn: (variables) =>
      apiRequest<{ folder: FolderItem }>('/folders', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders', variables.workspaceId] });
    },
  });
}

/**
 * Hook to retrieve documents in a folder or root of workspace.
 * folderId can be 'root' (all documents without folder) or specific folder UUID.
 */
export function useDocumentsList(workspaceId: string | undefined, folderId: string | undefined) {
  return useQuery<FetchDocumentsResponse, Error>({
    queryKey: ['documentsList', workspaceId, folderId],
    queryFn: () => {
      const folderParam = folderId ? `&folderId=${folderId}` : '';
      return apiRequest<FetchDocumentsResponse>(`/documents?workspaceId=${workspaceId}${folderParam}`);
    },
    enabled: !!workspaceId,
  });
}

/**
 * Hook to upload a file (image/pdf) to Supabase Storage and register metadata.
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation<
    { document: DocumentItem },
    Error,
    {
      workspaceId: string;
      folderId?: string; // Optional folder
      formData: FormData;
    }
  >({
    mutationFn: ({ formData }) =>
      apiUploadRequest<{ document: DocumentItem }>('/documents/upload', formData),
    onSuccess: (data, variables) => {
      // Invalidate both broad list and specific folder lists
      queryClient.invalidateQueries({ queryKey: ['documentsList', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaceDocuments', variables.workspaceId] });
    },
  });
}

/**
 * Hook to delete a document.
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; id: string },
    Error,
    { id: string; workspaceId: string }
  >({
    mutationFn: ({ id, workspaceId }) =>
      apiRequest<{ message: string; id: string }>(`/documents/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documentsList', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaceDocuments', variables.workspaceId] });
    },
  });
}

/**
 * Hook to delete a folder.
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; id: string },
    Error,
    { id: string; workspaceId: string }
  >({
    mutationFn: ({ id, workspaceId }) =>
      apiRequest<{ message: string; id: string }>(`/folders/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['folders', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['documentsList', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaceDocuments', variables.workspaceId] });
    },
  });
}


