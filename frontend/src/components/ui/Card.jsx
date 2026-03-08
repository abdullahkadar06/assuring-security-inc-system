export default function Card({ children, className = "" }) {
  return (
    <div
      className={
        "rounded-2xl border border-brand-line bg-brand-card/40 p-4 shadow-lg backdrop-blur-md transition-all duration-200 hover:border-brand-blue/50 " +
        className
      }
    >
      {children}
    </div>
  );
}