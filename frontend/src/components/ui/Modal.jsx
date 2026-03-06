export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 px-4 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-brand-card border border-brand-line rounded-3xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{title}</div>
          <button className="px-3 py-2 rounded-xl bg-brand-bg border border-brand-line text-sm" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}