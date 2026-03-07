export default function Input({ className = "", ...props }) {
  return (
    <input
      className={
        "w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3 text-brand-text outline-none transition-all duration-200 " +
        "placeholder:text-brand-text/45 focus:border-brand-blue/60 focus:bg-brand-bg/40 focus:ring-2 focus:ring-brand-blue/20 " +
        className
      }
      {...props}
    />
  );
}