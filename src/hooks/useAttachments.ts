import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';

export interface AttachmentItem {
  id: string;
  document_id: string;
  entity_type: 'EXPENSE' | 'TASK' | 'NOTE' | 'EVENT';
  entity_id: string;
  created_at: string;
  document_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
}

export interface DocumentItem {
  id: string;
  workspace_id: string;
  folder_id: string | null;
  name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploader_name: string | null;
  created_at: string;
}

interface FetchAttachmentsResponse {
  attachments: AttachmentItem[];
}

interface FetchDocumentsResponse {
  documents: DocumentItem[];
}

/**
 * Hook to query attachments for a specific entity.
 */
export function useAttachments(entityType: 'EXPENSE' | 'TASK' | 'NOTE' | 'EVENT', entityId: string | undefined) {
  return useQuery<FetchAttachmentsResponse, Error>({
    queryKey: ['attachments', entityType, entityId],
    queryFn: () => apiRequest<FetchAttachmentsResponse>(`/attachments?entityType=${entityType}&entityId=${entityId}`),
    enabled: !!entityId,
  });
}

/**
 * Hook to list all documents uploaded in a workspace.
 */
export function useWorkspaceDocuments(workspaceId: string | undefined) {
  return useQuery<FetchDocumentsResponse, Error>({
    queryKey: ['workspaceDocuments', workspaceId],
    queryFn: () => apiRequest<FetchDocumentsResponse>(`/documents?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to create a mock/new document in a workspace.
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation<
    { document: DocumentItem },
    Error,
    {
      workspaceId: string;
      name: string;
      fileUrl: string;
      fileSize?: number;
      mimeType?: string;
      folderId?: string;
    }
  >({
    mutationFn: (variables) =>
      apiRequest<{ document: DocumentItem }>('/documents', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspaceDocuments', variables.workspaceId] });
    },
  });
}

/**
 * Hook to link a document as an attachment.
 */
export function useCreateAttachment() {
  const queryClient = useQueryClient();

  return useMutation<
    { attachment: AttachmentItem },
    Error,
    {
      documentId: string;
      entityType: 'EXPENSE' | 'TASK' | 'NOTE' | 'EVENT';
      entityId: string;
    }
  >({
    mutationFn: (variables) =>
      apiRequest<{ attachment: AttachmentItem }>('/attachments', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['attachments', data.attachment.entity_type, data.attachment.entity_id],
      });
    },
  });
}

/**
 * Hook to unlink/delete an attachment.
 */
export function useDeleteAttachment(entityType: 'EXPENSE' | 'TASK' | 'NOTE' | 'EVENT', entityId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; attachment: AttachmentItem },
    Error,
    { id: string }
  >({
    mutationFn: ({ id }) =>
      apiRequest<{ message: string; attachment: AttachmentItem }>(`/attachments/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', entityType, entityId] });
    },
  });
}
