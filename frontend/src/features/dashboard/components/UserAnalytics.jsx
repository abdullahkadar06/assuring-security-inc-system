import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from "recharts";
import MiniChartCard from "./MiniChartCard";

const COLORS = ["#0B3D91", "#D32F2F", "#3B82F6", "#7DD3FC"];

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function buildUserAnalytics(today = [], weekly = null) {
  const latest = today?.[0] || {};
  const summary = weekly?.summary || {};

  const absentDays = safeNum(summary.absent_days);
  const paidHours = safeNum(summary.paid_hours);
  const workedHours = safeNum(summary.worked_net_hours);
  const totalPay = safeNum(summary.total_pay);
  const lateToday = safeNum(latest?.late_minutes) > 0 ? 1 : 0;

  const workedDaysEstimate = Math.max(0, 6 - absentDays - lateToday);

  const donutData = [
    { name: "Worked", value: workedDaysEstimate },
    { name: "Absent", value: absentDays },
    { name: "Late", value: lateToday }
  ].filter((x) => x.value > 0);

  const avgBase = workedHours > 0 ? workedHours / 6 : 0;

  const weeklyBarData = [
    { day: "Sat", hours: Number((avgBase * 0.8).toFixed(1)) },
    { day: "Sun", hours: Number((avgBase * 1.0).toFixed(1)) },
    { day: "Mon", hours: Number((avgBase * 1.1).toFixed(1)) },
    { day: "Tue", hours: Number((avgBase * 0.9).toFixed(1)) },
    { day: "Wed", hours: Number((avgBase * 1.05).toFixed(1)) },
    { day: "Thu", hours: Number((avgBase * 1.0).toFixed(1)) },
    { day: "Fri", hours: Number((avgBase * 0.95).toFixed(1)) }
  ];

  const lineTrendData = [
    { label: "W1", value: Number((workedHours * 0.72).toFixed(1)) },
    { label: "W2", value: Number((workedHours * 0.85).toFixed(1)) },
    { label: "W3", value: Number((workedHours * 0.93).toFixed(1)) },
    { label: "W4", value: Number(workedHours.toFixed(1)) }
  ];

  const summaryCards = [
    { label: "Worked Hours", value: workedHours },
    { label: "Paid Hours", value: paidHours },
    { label: "Absent Days", value: absentDays },
    { label: "Total Pay", value: totalPay }
  ];

  return { donutData, weeklyBarData, lineTrendData, summaryCards };
}

export default function UserAnalytics({ today = [], weekly = null }) {
  const { donutData, weeklyBarData, lineTrendData, summaryCards } =
    buildUserAnalytics(today, weekly);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-brand-line/70 bg-brand-card/35 p-4 transition-all duration-200 hover:-translate-y-[1px] hover:border-brand-blue/50 hover:shadow-soft"
          >
            <div className="text-xs text-brand-text/60">{item.label}</div>
            <div className="mt-2 text-xl font-bold text-white">{item.value}</div>
          </div>
        ))}
      </div>

      <MiniChartCard
        title="Attendance Distribution"
        subtitle="Based on your weekly attendance pattern"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={donutData.length ? donutData : [{ name: "No Data", value: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={82}
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
                borderRadius: 16,
                color: "#EAF0FF"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </MiniChartCard>

      <MiniChartCard
        title="Weekly Activity"
        subtitle="Estimated breakdown of your weekly worked hours"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyBarData}>
            <CartesianGrid stroke="#1D2A44" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="#EAF0FF" tick={{ fill: "#EAF0FF", fontSize: 12 }} />
            <YAxis stroke="#EAF0FF" tick={{ fill: "#EAF0FF", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "#0F1A2E",
                border: "1px solid #1D2A44",
                borderRadius: 16,
                color: "#EAF0FF"
              }}
            />
            <Bar dataKey="hours" radius={[10, 10, 0, 0]} fill="#0B3D91" />
          </BarChart>
        </ResponsiveContainer>
      </MiniChartCard>

      <MiniChartCard
        title="Attendance Trend"
        subtitle="Recent attendance trend (sample trend based on your totals)"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineTrendData}>
            <CartesianGrid stroke="#1D2A44" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#EAF0FF" tick={{ fill: "#EAF0FF", fontSize: 12 }} />
            <YAxis stroke="#EAF0FF" tick={{ fill: "#EAF0FF", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "#0F1A2E",
                border: "1px solid #1D2A44",
                borderRadius: 16,
                color: "#EAF0FF"
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#7DD3FC"
              strokeWidth={3}
              dot={{ r: 4, fill: "#7DD3FC" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </MiniChartCard>
    </div>
  );
}