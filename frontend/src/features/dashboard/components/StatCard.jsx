import Card from "../../../components/ui/Card";

export default function StatCard({ title, value }) {
  return (
    <Card className="transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand-blue/60">
      
      <div className="text-sm text-brand-text/70">
        {title}
      </div>

      <div className="text-2xl font-bold mt-2 tracking-wide text-white">
        {value}
      </div>

    </Card>
  );
}