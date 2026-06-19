import { create } from 'zustand';

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastStore {
  toast: ToastMessage | null;
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toast: null,
  showToast: (title, message, type = 'info') => {
    const id = Math.random().toString();
    set({ toast: { id, title, message, type } });
    setTimeout(() => {
      set((state) => {
        if (state.toast?.id === id) {
          return { toast: null };
        }
        return {};
      });
    }, 3000);
  },
  hideToast: () => set({ toast: null }),
}));
