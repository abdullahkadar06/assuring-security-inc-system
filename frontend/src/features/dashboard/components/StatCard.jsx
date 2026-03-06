import Card from "../../../components/ui/Card";

export default function StatCard({ title, value }) {
  return (
    <Card>
      <div className="text-sm text-brand-text/70">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}