import Card from "../../../components/ui/Card";

export default function StatCard({ title, value, icon = null }) {
  return (
    <Card className="transition-all duration-200 hover:-translate-y-1 hover:border-brand-blue/60 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-brand-text/70">{title}</div>

          <div className="mt-2 text-2xl font-bold tracking-wide text-white">
            {value}
          </div>
        </div>

        {icon ? (
          <div className="rounded-xl border border-brand-line/70 bg-brand-bg/40 p-2 text-brand-blue">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}