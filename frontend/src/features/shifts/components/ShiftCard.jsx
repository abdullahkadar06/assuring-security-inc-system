import { Clock3, MoonStar, Sunrise } from "lucide-react";
import Card from "../../../components/ui/Card";

function normalizeTime(value = "") {
  return String(value).slice(0, 5);
}

export default function ShiftCard({ shift }) {
  const code = String(shift?.code || "").toUpperCase();
  const isNight = code.includes("NIGHT");
  const isMorning = code.includes("MORNING");

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/35">
          {isNight ? (
            <MoonStar size={18} className="text-indigo-300" />
          ) : isMorning ? (
            <Sunrise size={18} className="text-amber-300" />
          ) : (
            <Clock3 size={18} className="text-brand-blue" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white">
            {shift.name} ({shift.code})
          </div>

          <div className="mt-1 text-sm text-brand-text/70">
            {normalizeTime(shift.start_time)} → {normalizeTime(shift.end_time)}
          </div>

          <div className="mt-1 text-xs text-brand-text/60">
            Grace: before {shift.grace_before_minutes}m / after{" "}
            {shift.grace_after_minutes}m | Active: {String(shift.is_active)}
          </div>
        </div>
      </div>
    </Card>
  );
}