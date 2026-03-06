export default function Button({ children, className = "", ...props }) {
  return (
    <button
      className={
        "w-full py-3 rounded-2xl font-semibold active:scale-[0.99] transition border " +
        "bg-brand-blue border-brand-blue text-white " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}