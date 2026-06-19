import React from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { hasPermission, ModuleName, PermissionAction } from '@/utils/permissions';

interface PermissionGuardProps {
  module: ModuleName;
  action: PermissionAction;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A UI guard that conditionally displays children if the user has the required permission.
 */
export function PermissionGuard({
  module,
  action,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

  if (!currentWorkspace) {
    return <>{fallback}</>;
  }

  const allowed = hasPermission(currentWorkspace.role, module, action);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
