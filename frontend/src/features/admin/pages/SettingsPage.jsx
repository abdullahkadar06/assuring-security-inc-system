import { useEffect, useState } from "react";
import { Settings2, Clock4, CalendarClock, BadgePercent, CalendarDays, Save, ShieldCheck } from "lucide-react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { settingsApi } from "../../../api/settings.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function SettingsPage() {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(true);
  const [overtime, setOvertime] = useState({
    overtime_mode: "NONE",
    daily_threshold_hours: 0,
    weekly_threshold_hours: 0,
    overtime_multiplier: 1,
    weekend_policy: "NONE",
  });

  useEffect(() => {
    (async () => {
      try {
        const d = await settingsApi.getOvertime();
        if (d?.overtime) setOvertime(d.overtime);
      } catch (e) {
        showToast("Failed loading overtime settings", "error");
      } finally {
        setBusy(false);
      }
    })();
  }, [showToast]);

  const save = async () => {
    setBusy(true);
    try {
      await settingsApi.updateOvertime({
        ...overtime,
        daily_threshold_hours: Number(overtime.daily_threshold_hours),
        weekly_threshold_hours: Number(overtime.weekly_threshold_hours),
        overtime_multiplier: Number(overtime.overtime_multiplier),
      });
      showToast("Configuration saved successfully", "success");
    } catch (e) {
      showToast("Save failed", "error");
    } finally { setBusy(false); }
  };

  if (busy) return <div className="p-10 text-center text-brand-text/60">Updating settings...</div>;

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/40 text-brand-blue">
          <Settings2 size={22} />
        </div>
        <div>
          <div className="text-lg font-semibold text-white">System Policies</div>
          <div className="mt-1 text-sm text-brand-text/65">Manage overtime rules and grace periods.</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <Clock4 size={16} className="text-brand-blue" /> Overtime Calculation Mode
          </label>
          <select className="w-full rounded-2xl border border-brand-line bg-[#0f172a] px-4 py-3 text-white outline-none focus:border-brand-blue"
            value={overtime.overtime_mode} onChange={(e) => setOvertime(s => ({...s, overtime_mode: e.target.value}))}>
            <option value="NONE">NO OVERTIME</option>
            <option value="DAILY">DAILY (After X hours)</option>
            <option value="WEEKLY">WEEKLY (After X hours)</option>
            <option value="BOTH">BOTH (Mixed Policy)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <CalendarClock size={16} className="text-amber-300" /> Daily Threshold
            </label>
            <Input type="number" value={overtime.daily_threshold_hours} onChange={(e) => setOvertime(s => ({...s, daily_threshold_hours: e.target.value}))} />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <CalendarClock size={16} className="text-emerald-400" /> Weekly Threshold
            </label>
            <Input type="number" value={overtime.weekly_threshold_hours} onChange={(e) => setOvertime(s => ({...s, weekly_threshold_hours: e.target.value}))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <BadgePercent size={16} className="text-brand-blue" /> Pay Multiplier (e.g 1.5)
            </label>
            <Input type="number" step="0.1" value={overtime.overtime_multiplier} onChange={(e) => setOvertime(s => ({...s, overtime_multiplier: e.target.value}))} />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <CalendarDays size={16} className="text-red-400" /> Weekend Policy
            </label>
            <select className="w-full rounded-2xl border border-brand-line bg-[#0f172a] px-4 py-3 text-white outline-none focus:border-brand-blue"
              value={overtime.weekend_policy} onChange={(e) => setOvertime(s => ({...s, weekend_policy: e.target.value}))}>
              <option value="NONE">NONE</option>
              <option value="SAT">SATURDAY</option>
              <option value="SUN">SUNDAY</option>
              <option value="BOTH">BOTH DAYS</option>
            </select>
          </div>
        </div>

        <Button onClick={save} className="w-full mt-2 flex items-center justify-center gap-2">
          <ShieldCheck size={18} /> Save Policies
        </Button>
      </div>
    </Card>
  );
}