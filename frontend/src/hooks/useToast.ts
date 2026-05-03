import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, type: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
}

let _seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type, duration) => {
    const ms = duration ?? (type === 'error' ? 5000 : 3500);
    const id = String(++_seq);
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration: ms }] }));
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      ms + 400,
    );
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    success: (msg: string, dur?: number) => push(msg, 'success', dur),
    error:   (msg: string, dur?: number) => push(msg, 'error',   dur),
    warning: (msg: string, dur?: number) => push(msg, 'warning', dur),
    info:    (msg: string, dur?: number) => push(msg, 'info',    dur),
  };
}
