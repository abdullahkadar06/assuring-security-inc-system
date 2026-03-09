export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-[32px] border border-brand-line bg-brand-card p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-xl font-semibold text-white">{title}</div>

          <button
            type="button"
            className="rounded-2xl border border-brand-line bg-brand-bg px-4 py-2 text-sm font-semibold text-brand-text transition-all duration-200 hover:-translate-y-[1px] hover:border-brand-blue/60 hover:bg-brand-blue/10 hover:shadow-soft"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}