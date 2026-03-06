import { Navigate, Outlet } from "react-router-dom";
import { useRole } from "../../hooks/useRole";

export default function RoleGuard({ allow = ["ADMIN"] }) {
  const { role } = useRole();
  if (!allow.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}