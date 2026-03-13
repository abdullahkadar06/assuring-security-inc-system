import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "../../api/auth.api";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      bootstrapping: false,
      hasHydrated: false,

      setAuth: ({ token, user }) =>
        set({
          token,
          user,
          bootstrapping: false,
        }),

      setUser: (user) => set({ user }),

      updateUser: (patch) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...patch } });
      },

      setBootstrapping: (bootstrapping) => set({ bootstrapping }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      fetchMe: async () => {
        const token = get().token;
        if (!token) return null;

        set({ bootstrapping: true });

        try {
          const data = await authApi.me();
          set({
            user: data.user,
            bootstrapping: false,
          });
          return data.user;
        } catch (error) {
          set({
            token: null,
            user: null,
            bootstrapping: false,
          });
          throw error;
        }
      },

      logout: () =>
        set({
          token: null,
          user: null,
          bootstrapping: false,
        }),
    }),
    {
      name: "assuring_auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated?.(true);
      },
    }
  )
);