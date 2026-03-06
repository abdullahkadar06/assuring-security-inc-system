export default function Card({ children, className = "" }) {
  return <div className={"p-4 rounded-2xl bg-brand-card border border-brand-line " + className}>{children}</div>;
}