import Card from "../../../components/ui/Card";

export default function MiniChartCard({ title, subtitle, children }) {
  return (
    <Card className="overflow-hidden">
      <div className="mb-3">
        <div className="text-sm font-semibold text-brand-text/80">{title}</div>
        {subtitle ? (
          <div className="mt-1 text-xs text-brand-text/55">{subtitle}</div>
        ) : null}
      </div>

      <div className="h-56 w-full">{children}</div>
    </Card>
  );
}