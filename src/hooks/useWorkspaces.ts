import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';

export interface Workspace {
  id: string;
  name: string;
  wedding_date: string;
  owner_id: string;
  archived: boolean;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  created_at: string;
}

interface FetchWorkspacesResponse {
  workspaces: Workspace[];
}

interface WorkspaceResponse {
  workspace: Workspace;
}

/**
 * Hook to fetch all user workspaces
 */
export function useWorkspaces() {
  return useQuery<FetchWorkspacesResponse, Error>({
    queryKey: ['workspaces'],
    queryFn: () => apiRequest<FetchWorkspacesResponse>('/workspaces'),
  });
}

/**
 * Hook to create a new workspace
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation<WorkspaceResponse, Error, { name: string; weddingDate: string }>({
    mutationFn: (variables) =>
      apiRequest<WorkspaceResponse>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

/**
 * Hook to update an existing workspace
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkspaceResponse,
    Error,
    { id: string; name: string; weddingDate: string }
  >({
    mutationFn: ({ id, name, weddingDate }) =>
      apiRequest<WorkspaceResponse>(`/workspaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, weddingDate }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', data.workspace.id] });
    },
  });
}

/**
 * Hook to archive (delete) a workspace
 */
export function useArchiveWorkspace() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string; workspace: Workspace }, Error, string>({
    mutationFn: (id) =>
      apiRequest<{ message: string; workspace: Workspace }>(`/workspaces/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
