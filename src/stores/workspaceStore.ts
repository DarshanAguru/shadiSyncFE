import { create } from 'zustand';

export interface Workspace {
  id: string;
  name: string;
  weddingDate: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  cover_image_url?: string | null;
  permissions?: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> | null;
  allocated_budget?: string | number | null;
}

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  workspaces: [],
  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
}));
