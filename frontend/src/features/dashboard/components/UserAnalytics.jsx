import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import MiniChartCard from "./MiniChartCard";

const COLORS = ["#0B3D91", "#D32F2F", "#3B82F6", "#94A3B8"];

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function UserAnalytics({ today = [], weekly = null }) {
  const latest = today?.[0] || {};
  const summary = weekly?.summary || {};

  const absentDays = safeNum(summary.absent_days);
  const lateToday = safeNum(latest?.late_minutes) > 0 ? 1 : 0;

  const workedDaysEstimate = Math.max(0, Number(summary.shifts_count ?? 0));

  const rawData = [
    { name: "Worked Days", value: workedDaysEstimate },
    { name: "Absent", value: absentDays },
    { name: "Late Today", value: lateToday },
  ];

  const donutData = rawData.filter((x) => x.value > 0);
  const chartData = donutData.length ? donutData : [{ name: "No Data", value: 1 }];

  return (
    <div className="space-y-4">
      <MiniChartCard
        title="Attendance Distribution"
        subtitle="Weekly attendance overview based on worked, absent, and late activity"
      >
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                background: "#0F1A2E",
                border: "1px solid #1D2A44",
                borderRadius: 12,
                color: "#EAF0FF",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {chartData.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-2xl border border-brand-line/60 bg-brand-bg/20 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-brand-text/70">{item.name}</span>
              </div>
              <span className="font-semibold text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </MiniChartCard>
    </div>
  );
}