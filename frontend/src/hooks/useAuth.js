import { useAuthStore } from "../state/auth/auth.store";

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const updateUser = useAuthStore((s) => s.updateUser);

  return { token, user, logout, setUser, updateUser, isAuthed: !!token };
}