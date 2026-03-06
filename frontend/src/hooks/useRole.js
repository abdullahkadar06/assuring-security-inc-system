import { useAuthStore } from "../state/auth/auth.store";

export function useRole() {
  const role = useAuthStore((s) => s.user?.role || "EMPLOYEE");
  return { role, isAdmin: role === "ADMIN" };
}