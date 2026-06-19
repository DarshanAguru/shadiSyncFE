import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  created_at: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  event_id: string | null;
  event_title: string | null;
  created_at: string;
}

interface FetchEventsResponse {
  events: EventItem[];
}

interface FetchCategoriesResponse {
  categories: CategoryItem[];
}

/**
 * Hook to query all events inside a workspace.
 */
export function useEvents(workspaceId: string | undefined) {
  return useQuery<FetchEventsResponse, Error>({
    queryKey: ['events', workspaceId],
    queryFn: () => apiRequest<FetchEventsResponse>(`/events?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to create an event.
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation<
    { event: EventItem },
    Error,
    {
      workspaceId: string;
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      location?: string;
    }
  >({
    mutationFn: (variables) =>
      apiRequest<{ event: EventItem }>('/events', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', variables.workspaceId] });
    },
  });
}

/**
 * Hook to update an event.
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation<
    { event: EventItem },
    Error,
    {
      id: string;
      workspaceId: string;
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      location?: string;
    }
  >({
    mutationFn: ({ id, ...body }) =>
      apiRequest<{ event: EventItem }>(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', variables.workspaceId] });
    },
  });
}

/**
 * Hook to delete an event.
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; event: EventItem },
    Error,
    { id: string; workspaceId: string }
  >({
    mutationFn: ({ id }) =>
      apiRequest<{ message: string; event: EventItem }>(`/events/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['categories', variables.workspaceId] }); // Event deletion cascades / changes categories
    },
  });
}

/**
 * Hook to query all categories inside a workspace.
 */
export function useCategories(workspaceId: string | undefined) {
  return useQuery<FetchCategoriesResponse, Error>({
    queryKey: ['categories', workspaceId],
    queryFn: () => apiRequest<FetchCategoriesResponse>(`/categories?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to create a category.
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation<
    { category: CategoryItem },
    Error,
    { workspaceId: string; name: string; eventId?: string }
  >({
    mutationFn: (variables) =>
      apiRequest<{ category: CategoryItem }>('/categories', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories', variables.workspaceId] });
    },
  });
}

/**
 * Hook to delete a category.
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; category: CategoryItem },
    Error,
    { id: string; workspaceId: string }
  >({
    mutationFn: ({ id }) =>
      apiRequest<{ message: string; category: CategoryItem }>(`/categories/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories', variables.workspaceId] });
    },
  });
}
