import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onSelect: () => void;
}

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  /**
   * A real sentence with names, times and a street — never a code. The design sizes the
   * toast for two lines of this at 12.5px.
   */
  body?: string;
  actions?: ToastAction[];
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id" | "duration"> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

/**
 * Rejections keep the same shape as successes so the eye lands in the same place; only
 * the glyph and the rule change. Errors linger longer because they carry the sentence
 * the coordinator has to act on.
 */
const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 5000,
  info: 5000,
  error: 9000,
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push(toast) {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id, duration: toast.duration ?? DEFAULT_DURATION[toast.tone] },
      ],
    }));
    return id;
  },

  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

/** Imperative helpers, so a submit handler does not need the hook. */
export const toast = {
  success: (title: string, body?: string) =>
    useToastStore.getState().push({ tone: "success", title, body }),
  error: (title: string, body?: string) =>
    useToastStore.getState().push({ tone: "error", title, body }),
  info: (title: string, body?: string) =>
    useToastStore.getState().push({ tone: "info", title, body }),
};
