import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from "recharts";
import MiniChartCard from "./MiniChartCard";

const COLORS = ["#0B3D91", "#D32F2F", "#3B82F6"];

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function UserAnalytics({ today = [], weekly = null }) {
  const latest = today?.[0] || {};
  const summary = weekly?.summary || {};

  const absentDays = safeNum(summary.absent_days);
  const workedHours = safeNum(summary.worked_net_hours);
  const lateToday = safeNum(latest?.late_minutes) > 0 ? 1 : 0;
  const workedDaysEstimate = Math.max(0, 6 - absentDays - lateToday);

  const donutData = [
    { name: "Worked Days", value: workedDaysEstimate },
    { name: "Absent", value: absentDays },
    { name: "Late", value: lateToday }
  ].filter((x) => x.value > 0);

  return (
    <div className="space-y-4">
      <MiniChartCard
        title="Attendance Distribution"
        subtitle="Based on your weekly attendance pattern"
      >
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={donutData.length ? donutData : [{ name: "No Data", value: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {(donutData.length ? donutData : [{ name: "No Data", value: 1 }]).map(
                (_, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                )
              )}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0F1A2E",
                border: "1px solid #1D2A44",
                borderRadius: 12,
                color: "#EAF0FF"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </MiniChartCard>
    </div>
  );
}