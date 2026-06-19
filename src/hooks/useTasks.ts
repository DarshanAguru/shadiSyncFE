import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';

export interface TaskItem {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  assigned_to: string | null;
  assignee_name: string | null;
  due_date: string | null;
  event_id: string | null;
  event_title: string | null;
  category_id: string | null;
  category_name: string | null;
  created_by: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface FetchTasksResponse {
  tasks: TaskItem[];
}

interface FetchMembersResponse {
  members: WorkspaceMember[];
}

/**
 * Hook to query all tasks inside a workspace.
 */
export function useTasks(workspaceId: string | undefined) {
  return useQuery<FetchTasksResponse, Error>({
    queryKey: ['tasks', workspaceId],
    queryFn: () => apiRequest<FetchTasksResponse>(`/tasks?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to retrieve all workspace members (assignees list).
 */
export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery<FetchMembersResponse, Error>({
    queryKey: ['members', workspaceId],
    queryFn: () => apiRequest<FetchMembersResponse>(`/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to create a task.
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation<
    { task: TaskItem },
    Error,
    {
      workspaceId: string;
      title: string;
      description?: string;
      priority: 'Low' | 'Medium' | 'High';
      assignedTo?: string;
      dueDate?: string;
      eventId?: string;
      categoryId?: string;
    }
  >({
    mutationFn: (variables) =>
      apiRequest<{ task: TaskItem }>('/tasks', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.workspaceId] });
    },
  });
}

/**
 * Hook to update/edit a task (edit, assign, complete).
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation<
    { task: TaskItem },
    Error,
    {
      id: string;
      workspaceId: string;
      title: string;
      description?: string;
      status: 'Pending' | 'In Progress' | 'Completed';
      priority: 'Low' | 'Medium' | 'High';
      assignedTo?: string;
      dueDate?: string;
      eventId?: string;
      categoryId?: string;
    }
  >({
    mutationFn: ({ id, ...body }) =>
      apiRequest<{ task: TaskItem }>(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.workspaceId] });
    },
  });
}

/**
 * Hook to delete a task.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; task: TaskItem },
    Error,
    { id: string; workspaceId: string }
  >({
    mutationFn: ({ id }) =>
      apiRequest<{ message: string; task: TaskItem }>(`/tasks/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.workspaceId] });
    },
  });
}
