import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "../../components/ui/Loader";
import { useAuth } from "../../hooks/useAuth";

export default function AuthGuard() {
  const { isAuthed, token, fetchMe, bootstrapping } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!token) return;

    fetchMe().catch(() => {
      // auth.store ayaa nadiifinaya haddii token-ku xumaado
    });
  }, [token, fetchMe]);

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (bootstrapping) {
    return <Loader label="Loading your session..." />;
  }

  return <Outlet />;
}