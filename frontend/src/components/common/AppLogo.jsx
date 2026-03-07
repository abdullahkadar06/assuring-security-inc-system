export default function AppLogo({ small = false }) {
  return (
    <div className={`flex items-center gap-2 ${small ? "mb-2" : "mb-4"}`}>
      <img
        src="/favicon.png"
        alt="Assuring Security Inc"
        className={small ? "w-8 h-8 rounded-md object-contain" : "w-10 h-10 rounded-md object-contain"}
      />
      <div className="leading-tight">
        <div className="text-[11px] uppercase tracking-wide text-brand-text/70">
          Assuring Security Inc
        </div>
      </div>
    </div>
  );
}