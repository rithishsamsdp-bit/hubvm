import { create } from "zustand";
import { nanoid } from "nanoid";

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { id: nanoid(), ...toast }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  success: (msg) => useToastStore.getState().addToast({ type: "success", message: msg }),
  error: (msg) => useToastStore.getState().addToast({ type: "error", message: msg }),
  warning: (msg) => useToastStore.getState().addToast({ type: "warning", message: msg }),
  info: (msg) => useToastStore.getState().addToast({ type: "info", message: msg }),
};
