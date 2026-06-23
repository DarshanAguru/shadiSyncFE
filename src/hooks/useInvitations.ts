import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';

export interface Invitation {
  id: string;
  workspace_id: string;
  role: 'EDITOR' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  created_at: string;
  workspace_name: string;
  inviter_name: string;
}

interface FetchInvitationsResponse {
  invitations: Invitation[];
}

export function usePendingInvitations() {
  return useQuery<FetchInvitationsResponse, Error>({
    queryKey: ['invitations', 'pending'],
    queryFn: () => apiRequest<FetchInvitationsResponse>('/invitations/pending'),
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; invite: any; userExists: boolean },
    Error,
    { workspaceId: string; phoneNumber: string; role: 'EDITOR' | 'VIEWER'; permissions?: any; allocatedBudget?: number | null }
  >({
    mutationFn: (variables) =>
      apiRequest<{ message: string; invite: any; userExists: boolean }>('/invitations/send', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['workspaceMembers', variables.workspaceId] });
    },
  });
}

export function useRespondInvitation() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    { id: string; action: 'ACCEPT' | 'REJECT' }
  >({
    mutationFn: ({ id, action }) =>
      apiRequest<{ message: string }>(`/invitations/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
