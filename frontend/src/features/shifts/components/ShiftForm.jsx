import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Sunrise,
  MoonStar,
  Sparkles,
  BadgeCheck,
  TimerReset,
  Type,
} from "lucide-react";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { shiftsApi } from "../../../api/shifts.api";
import { useUiStore } from "../../../state/ui/ui.store";

const SHIFT_PRESETS = [
  {
    key: "MORNING",
    code: "MORNING",
    name: "Morning Shift",
    start_time: "08:00",
    end_time: "16:00",
    grace_before_minutes: 15,
    grace_after_minutes: 15,
    is_active: true,
  },
  {
    key: "NIGHT",
    code: "NIGHT",
    name: "Night Shift",
    start_time: "23:00",
    end_time: "07:00",
    grace_before_minutes: 15,
    grace_after_minutes: 15,
    is_active: true,
  },
];

function normalizeTime(value = "") {
  return String(value || "").slice(0, 5);
}

function buildTimeOptions() {
  const options = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hh = String(hour).padStart(2, "0");
      const mm = String(minute).padStart(2, "0");
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();
const GRACE_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60];

function PresetCard({ preset, active, onClick }) {
  const isNight = preset.code === "NIGHT";
  const isMorning = preset.code === "MORNING";

  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <div
        className={[
          "rounded-2xl border p-3 transition-all duration-200",
          active
            ? "border-brand-blue bg-brand-blue/10 ring-1 ring-brand-blue/40"
            : "border-brand-line/70 bg-brand-bg/20 hover:border-brand-blue/50",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div
            className={[
              "flex h-10 w-10 items-center justify-center rounded-2xl border",
              active
                ? "border-brand-blue/60 bg-brand-blue/15"
                : "border-brand-line/70 bg-brand-card/30",
            ].join(" ")}
          >
            {isNight ? (
              <MoonStar size={18} className="text-indigo-300" />
            ) : isMorning ? (
              <Sunrise size={18} className="text-amber-300" />
            ) : (
              <Clock3 size={18} className="text-brand-blue" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white">{preset.name}</div>
            <div className="mt-1 text-xs text-brand-text/65">
              {preset.code} • {preset.start_time} → {preset.end_time}
            </div>
          </div>

          {active ? (
            <div className="text-brand-blue">
              <BadgeCheck size={18} />
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default function ShiftForm({
  onSaved,
  mode = "create",
  initialData = null,
}) {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [start_time, setStart] = useState("");
  const [end_time, setEnd] = useState("");
  const [grace_before_minutes, setGraceBefore] = useState(15);
  const [grace_after_minutes, setGraceAfter] = useState(15);
  const [is_active, setIsActive] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("");

  useEffect(() => {
    if (initialData && mode === "edit") {
      const safeStart = normalizeTime(initialData.start_time);
      const safeEnd = normalizeTime(initialData.end_time);

      setCode(initialData.code || "");
      setName(initialData.name || "");
      setStart(safeStart);
      setEnd(safeEnd);
      setGraceBefore(Number(initialData.grace_before_minutes ?? 15));
      setGraceAfter(Number(initialData.grace_after_minutes ?? 15));
      setIsActive(Boolean(initialData.is_active));

      const found = SHIFT_PRESETS.find(
        (p) =>
          p.code === initialData.code &&
          normalizeTime(p.start_time) === safeStart &&
          normalizeTime(p.end_time) === safeEnd
      );
      setSelectedPreset(found?.key || initialData.code || "");
      return;
    }

    if (mode === "create") {
      setCode("");
      setName("");
      setStart("");
      setEnd("");
      setGraceBefore(15);
      setGraceAfter(15);
      setIsActive(true);
      setSelectedPreset("");
    }
  }, [initialData, mode]);

  const activePresetObject = useMemo(
    () => SHIFT_PRESETS.find((p) => p.key === selectedPreset) || null,
    [selectedPreset]
  );

  const applyPreset = (preset) => {
    setSelectedPreset(preset.key);
    setCode(preset.code);
    setName(preset.name);
    setStart(preset.start_time);
    setEnd(preset.end_time);
    setGraceBefore(preset.grace_before_minutes);
    setGraceAfter(preset.grace_after_minutes);
    setIsActive(Boolean(preset.is_active));
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!selectedPreset) {
      showToast("Please choose Morning or Night shift", "error");
      return;
    }

    if (!name.trim()) {
      showToast("Shift name is required", "error");
      return;
    }

    if (!start_time) {
      showToast("Start time is required", "error");
      return;
    }

    if (!end_time) {
      showToast("End time is required", "error");
      return;
    }

    const payload = {
      code: code.toUpperCase().trim(),
      name: name.trim(),
      start_time,
      end_time,
      grace_before_minutes: Number(grace_before_minutes),
      grace_after_minutes: Number(grace_after_minutes),
      is_active: Boolean(is_active),
    };

    setBusy(true);

    try {
      if (mode === "edit" && initialData?.id) {
        await shiftsApi.update(initialData.id, payload);
        showToast("Shift updated", "success");
      } else {
        await shiftsApi.create(payload);
        showToast("Shift created", "success");
      }

      onSaved?.();
    } catch (e2) {
      showToast(
        e2?.response?.data?.message ||
          (mode === "edit" ? "Update failed" : "Create failed"),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/20 p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-text/80">
          <Sparkles size={16} className="text-brand-blue" />
          <span>Choose Shift Type</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {SHIFT_PRESETS.map((preset) => (
            <PresetCard
              key={preset.key}
              preset={preset}
              active={selectedPreset === preset.key}
              onClick={() => applyPreset(preset)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/20 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/80">
          <Type size={16} className="text-brand-blue" />
          <span>Shift Name</span>
        </div>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type shift name e.g. Evening Shift"
        />

        {code ? (
          <div className="mt-2 text-xs text-brand-text/60">
            Code: <span className="font-semibold text-brand-text/85">{code}</span>
          </div>
        ) : (
          <div className="mt-2 text-xs text-brand-text/60">
            Select Morning or Night above first.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 text-sm text-brand-text/70">Start Time</div>
          <select
            value={start_time}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3 text-brand-text outline-none transition-all duration-200 focus:border-brand-blue/60 focus:bg-brand-bg/40 focus:ring-2 focus:ring-brand-blue/20"
          >
            <option value="">Select start time</option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-sm text-brand-text/70">End Time</div>
          <select
            value={end_time}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3 text-brand-text outline-none transition-all duration-200 focus:border-brand-blue/60 focus:bg-brand-bg/40 focus:ring-2 focus:ring-brand-blue/20"
          >
            <option value="">Select end time</option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 text-sm text-brand-text/70">Grace Before</div>
          <select
            value={grace_before_minutes}
            onChange={(e) => setGraceBefore(Number(e.target.value))}
            className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3 text-brand-text outline-none transition-all duration-200 focus:border-brand-blue/60 focus:bg-brand-bg/40 focus:ring-2 focus:ring-brand-blue/20"
          >
            {GRACE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} min
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-sm text-brand-text/70">Grace After</div>
          <select
            value={grace_after_minutes}
            onChange={(e) => setGraceAfter(Number(e.target.value))}
            className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3 text-brand-text outline-none transition-all duration-200 focus:border-brand-blue/60 focus:bg-brand-bg/40 focus:ring-2 focus:ring-brand-blue/20"
          >
            {GRACE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} min
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/20 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/80">
          <TimerReset size={16} className="text-amber-300" />
          <span>Status</span>
        </div>

        <select
          value={is_active ? "true" : "false"}
          onChange={(e) => setIsActive(e.target.value === "true")}
          className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3 text-brand-text outline-none transition-all duration-200 focus:border-brand-blue/60 focus:bg-brand-bg/40 focus:ring-2 focus:ring-brand-blue/20"
        >
          <option value="true">ACTIVE</option>
          <option value="false">INACTIVE</option>
        </select>
      </div>

      {activePresetObject ? (
        <div className="rounded-2xl border border-brand-blue/30 bg-brand-blue/10 px-4 py-3 text-sm text-brand-text/80">
          Preset selected:{" "}
          <span className="font-semibold text-white">
            {activePresetObject.name}
          </span>
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={busy}
        className="flex items-center justify-center gap-2"
      >
        <Clock3 size={18} />
        <span>
          {busy ? "Saving..." : mode === "edit" ? "Update Shift" : "Save Shift"}
        </span>
      </Button>
    </form>
  );
}