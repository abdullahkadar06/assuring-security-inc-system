export default function Loader({ label = "Loading..." }) {
  return <div className="py-6 text-center text-brand-text/70 animate-pulse">{label}</div>;
}