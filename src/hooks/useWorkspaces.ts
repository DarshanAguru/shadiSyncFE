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
  cover_image_url?: string | null;
  permissions?: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> | null;
  allocated_budget?: string | number | null;
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
    { id: string; name?: string; weddingDate?: string; coverImageUrl?: string | null }
  >({
    mutationFn: ({ id, ...body }) =>
      apiRequest<WorkspaceResponse>(`/workspaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
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

export interface WorkspaceMember {
  id: string;
  name: string;
  phone: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  permissions?: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> | null;
  allocated_budget?: string | number | null;
}

export interface WorkspaceInvitation {
  id: string;
  phone_number: string;
  role: 'EDITOR' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  permissions?: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> | null;
  allocated_budget?: string | number | null;
  created_at: string;
}

interface FetchMembersResponse {
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery<FetchMembersResponse, Error>({
    queryKey: ['workspaceMembers', workspaceId],
    queryFn: () => apiRequest<FetchMembersResponse>(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });
}

export function useUpdateWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    {
      workspaceId: string;
      targetUserId?: string;
      invitationId?: string;
      role?: 'OWNER' | 'EDITOR' | 'VIEWER';
      permissions?: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> | null;
      allocatedBudget?: number | string | null;
    }
  >({
    mutationFn: ({ workspaceId, ...body }) =>
      apiRequest<{ message: string }>(`/workspaces/${workspaceId}/members`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspaceMembers', variables.workspaceId] });
    },
  });
}
