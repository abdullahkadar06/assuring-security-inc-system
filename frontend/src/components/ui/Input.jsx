export default function Input({ className = "", ...props }) {
  return (
    <input
      className={
        "w-full px-4 py-3 rounded-2xl bg-brand-card border border-brand-line " +
        "text-brand-text placeholder:text-brand-text/50 outline-none " +
        className
      }
      {...props}
    />
  );
}