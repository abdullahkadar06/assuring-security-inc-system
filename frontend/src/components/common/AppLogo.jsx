export default function AppLogo() {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/favicon.png"
        alt="Assuring Security Inc"
        className="h-7 w-7 shrink-0 object-contain"
      />

      <span className="text-xs font-semibold tracking-wide text-brand-text/85">
        ASSURING SECURITY INC
      </span>
    </div>
  );
}