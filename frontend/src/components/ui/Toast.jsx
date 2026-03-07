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
    <div className="fixed top-3 left-0 right-0 z-50 px-4">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-brand-line/80 bg-brand-card/95 px-4 py-3 text-sm shadow-soft backdrop-blur">
          {toast.message}
        </div>
      </div>
    </div>
  );
}