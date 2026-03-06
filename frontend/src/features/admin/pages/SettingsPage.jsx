import { useEffect, useState } from "react";
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
    weekend_policy: "NONE"
  });

  useEffect(() => {
    (async () => {
      try {
        const d = await settingsApi.getOvertime();
        setOvertime(d?.overtime || overtime);
      } catch (e) {
        showToast(e?.response?.data?.message || "Failed loading overtime", "error");
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    try {
      await settingsApi.updateOvertime({
        overtime_mode: overtime.overtime_mode,
        daily_threshold_hours: Number(overtime.daily_threshold_hours),
        weekly_threshold_hours: Number(overtime.weekly_threshold_hours),
        overtime_multiplier: Number(overtime.overtime_multiplier),
        weekend_policy: overtime.weekend_policy
      });
      showToast("Saved");
    } catch (e) {
      showToast(e?.response?.data?.message || "Save failed", "error");
    }
  };

  if (busy) return <Card>Loading...</Card>;

  return (
    <Card className="space-y-3">
      <div>
        <div className="text-sm text-brand-text/70 mb-1">Overtime mode</div>
        <select
          className="w-full px-4 py-3 rounded-2xl bg-brand-card border border-brand-line"
          value={overtime.overtime_mode}
          onChange={(e) => setOvertime((s) => ({ ...s, overtime_mode: e.target.value }))}
        >
          <option value="NONE">NONE</option>
          <option value="DAILY">DAILY</option>
          <option value="WEEKLY">WEEKLY</option>
          <option value="BOTH">BOTH</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-sm text-brand-text/70 mb-1">Daily threshold</div>
          <Input value={overtime.daily_threshold_hours} onChange={(e) => setOvertime((s) => ({ ...s, daily_threshold_hours: e.target.value }))} />
        </div>
        <div>
          <div className="text-sm text-brand-text/70 mb-1">Weekly threshold</div>
          <Input value={overtime.weekly_threshold_hours} onChange={(e) => setOvertime((s) => ({ ...s, weekly_threshold_hours: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-sm text-brand-text/70 mb-1">Multiplier</div>
          <Input value={overtime.overtime_multiplier} onChange={(e) => setOvertime((s) => ({ ...s, overtime_multiplier: e.target.value }))} />
        </div>
        <div>
          <div className="text-sm text-brand-text/70 mb-1">Weekend policy</div>
          <select
            className="w-full px-4 py-3 rounded-2xl bg-brand-card border border-brand-line"
            value={overtime.weekend_policy}
            onChange={(e) => setOvertime((s) => ({ ...s, weekend_policy: e.target.value }))}
          >
            <option value="NONE">NONE</option>
            <option value="SAT">SAT</option>
            <option value="SUN">SUN</option>
            <option value="BOTH">BOTH</option>
          </select>
        </div>
      </div>

      <Button onClick={save}>Save</Button>
    </Card>
  );
}