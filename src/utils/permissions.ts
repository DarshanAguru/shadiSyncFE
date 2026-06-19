export type UserRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export type ModuleName =
  | 'Dashboard'
  | 'Expenses'
  | 'Tasks'
  | 'Documents'
  | 'Notes'
  | 'Events'
  | 'Budget';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

/**
 * Checks if a specific role has permission to perform an action on a module.
 * Evaluates locally to minimize API traffic.
 */
export function hasPermission(
  role: UserRole | undefined,
  moduleName: ModuleName,
  action: PermissionAction
): boolean {
  if (!role) return false;

  // 1. OWNER has full access to all modules and actions
  if (role === 'OWNER') {
    return true;
  }

  // 2. EDITOR can view, create, and edit, but cannot delete
  if (role === 'EDITOR') {
    return action !== 'delete';
  }

  // 3. VIEWER can only view
  if (role === 'VIEWER') {
    return action === 'view';
  }

  return false;
}
