export default function Loader({ label = "Loading..." }) {
  return (
    <div className="py-8 text-center text-sm text-brand-text/70">
      <div className="inline-flex items-center gap-2 rounded-2xl border border-brand-line bg-brand-card px-4 py-3 shadow-soft">
        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-brand-blue" />
        <span>{label}</span>
      </div>
    </div>
  );
}