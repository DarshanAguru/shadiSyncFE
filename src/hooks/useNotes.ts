import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';

export interface NoteItem {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_by: string;
  creator_name: string | null;
  created_at: string;
  updated_at: string;
}

interface FetchNotesResponse {
  notes: NoteItem[];
}

/**
 * Hook to retrieve notes list.
 */
export function useNotes(workspaceId: string | undefined, search: string = '') {
  return useQuery<FetchNotesResponse, Error>({
    queryKey: ['notes', workspaceId, search],
    queryFn: () => {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      return apiRequest<FetchNotesResponse>(`/notes?workspaceId=${workspaceId}${searchParam}`);
    },
    enabled: !!workspaceId,
  });
}

/**
 * Hook to create a note.
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation<
    { note: NoteItem },
    Error,
    { workspaceId: string; title: string; content?: string; isPinned?: boolean }
  >({
    mutationFn: (variables) =>
      apiRequest<{ note: NoteItem }>('/notes', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes', variables.workspaceId] });
    },
  });
}

/**
 * Hook to update note (including pinning status).
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation<
    { note: NoteItem },
    Error,
    { id: string; workspaceId: string; title: string; content?: string; isPinned?: boolean }
  >({
    mutationFn: ({ id, workspaceId, ...variables }) =>
      apiRequest<{ note: NoteItem }>(`/notes/${id}?workspaceId=${workspaceId}`, {
        method: 'PUT',
        body: JSON.stringify({ workspaceId, ...variables }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes', data.note.workspace_id] });
    },
  });
}

/**
 * Hook to delete note.
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; note: NoteItem },
    Error,
    { id: string; workspaceId: string }
  >({
    mutationFn: ({ id, workspaceId }) =>
      apiRequest<{ message: string; note: NoteItem }>(`/notes/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes', data.note.workspace_id] });
    },
  });
}
