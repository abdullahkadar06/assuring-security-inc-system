import { create } from "zustand";

export const useUiStore = create((set) => ({
  toast: null,
  showToast: (message, type = "info") => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null })
}));