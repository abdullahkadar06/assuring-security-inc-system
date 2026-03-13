import { useAuthStore } from "../state/auth/auth.store";

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const bootstrapping = useAuthStore((s) => s.bootstrapping);

  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const updateUser = useAuthStore((s) => s.updateUser);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);

  return {
    token,
    user,
    bootstrapping,
    logout,
    setUser,
    updateUser,
    fetchMe,
    setBootstrapping,
    isAuthed: !!token,
  };
}