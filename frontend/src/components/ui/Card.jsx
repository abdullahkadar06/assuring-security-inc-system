export default function Card({ children, className = "" }) {
  return (
    <div
      className={
        "p-4 rounded-2xl border border-brand-line bg-brand-card/40 backdrop-blur-md shadow-lg transition-all duration-200 hover:border-brand-blue/50 " +
        className
      }
    >
      {children}
    </div>
  );
}