import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: ({ token, user }) => set({ token, user }),

      setUser: (user) => set({ user }),

      updateUser: (patch) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...patch } });
      },

      logout: () => set({ token: null, user: null })
    }),
    { name: "assuring_auth" }
  )
);