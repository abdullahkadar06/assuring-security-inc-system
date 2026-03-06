import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Outlet />
      </div>
    </div>
  );
}