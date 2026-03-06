import { useEffect } from "react";
import { useUiStore } from "../../state/ui/ui.store";

export default function Toast() {
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => clearToast(), 2500);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className="fixed top-3 left-0 right-0 px-4 z-50">
      <div className="mx-auto w-full max-w-md">
        <div className="px-4 py-3 rounded-2xl bg-brand-card border border-brand-line">{toast.message}</div>
      </div>
    </div>
  );
}