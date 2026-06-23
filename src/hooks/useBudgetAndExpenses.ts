import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../utils/api';

export interface Budget {
  id: string;
  workspace_id: string;
  allocated: string; // postgres NUMERIC type returns string to preserve precision
  spent: string;     // calculated dynamically on backend
}

export interface ExpenseItem {
  id: string;
  amount: string;
  description: string | null;
  expense_date: string;
  created_at: string;
  category_name: string | null;
  event_title: string | null;
  task_title: string | null;
  task_id: string | null;
  creator_name: string | null;
  created_by?: string | null;
}

interface FetchBudgetResponse {
  budget: Budget;
}

interface FetchExpensesResponse {
  expenses: ExpenseItem[];
}

/**
 * Hook to query budget for workspace.
 */
export function useBudget(workspaceId: string | undefined) {
  return useQuery<FetchBudgetResponse, Error>({
    queryKey: ['budget', workspaceId],
    queryFn: () => apiRequest<FetchBudgetResponse>(`/budgets?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to update budget allocation (Owner-only).
 */
export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation<
    { budget: Budget },
    Error,
    { workspaceId: string; allocated: number }
  >({
    mutationFn: (variables) =>
      apiRequest<{ budget: Budget }>('/budgets', {
        method: 'PUT',
        body: JSON.stringify(variables),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budget', variables.workspaceId] });
    },
  });
}

/**
 * Hook to query all expenses.
 */
export function useExpensesList(workspaceId: string | undefined) {
  return useQuery<FetchExpensesResponse, Error>({
    queryKey: ['expenses', workspaceId],
    queryFn: () => apiRequest<FetchExpensesResponse>(`/expenses?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });
}

/**
 * Hook to record a new expense.
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation<
    { expense: ExpenseItem },
    Error,
    {
      workspaceId: string;
      amount: number;
      description?: string;
      categoryId?: string;
      eventId?: string;
      taskId?: string;
      expenseDate?: string;
    }
  >({
    mutationFn: (variables) =>
      apiRequest<{ expense: ExpenseItem }>('/expenses', {
        method: 'POST',
        body: JSON.stringify(variables),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['budget', variables.workspaceId] });
    },
  });
}

/**
 * Hook to delete an expense.
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; expense: ExpenseItem },
    Error,
    { id: string; workspaceId: string }
  >({
    mutationFn: ({ id }) =>
      apiRequest<{ message: string; expense: ExpenseItem }>(`/expenses/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['budget', variables.workspaceId] });
    },
  });
}

/**
 * Hook to update an expense.
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation<
    { expense: ExpenseItem },
    Error,
    {
      id: string;
      workspaceId: string;
      amount: number;
      description?: string;
      categoryId?: string;
      eventId?: string;
      taskId?: string;
      expenseDate?: string;
    }
  >({
    mutationFn: ({ id, ...body }) =>
      apiRequest<{ expense: ExpenseItem }>(`/expenses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['budget', variables.workspaceId] });
    },
  });
}

