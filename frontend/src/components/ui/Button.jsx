export default function Button({ children, className = "", ...props }) {
  return (
    <button
      className={
        "w-full rounded-2xl border border-brand-blue bg-brand-blue px-4 py-3 text-center text-sm font-semibold text-white " +
        "transition-all duration-200 hover:-translate-y-[1px] hover:shadow-soft hover:brightness-110 active:translate-y-0 " +
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}