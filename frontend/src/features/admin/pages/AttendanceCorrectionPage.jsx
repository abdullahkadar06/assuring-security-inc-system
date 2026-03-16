import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Clock3,
  Clock4,
  FilePenLine,
  Save,
  Search,
  Users,
  CalendarDays,
  MoonStar,
  SunMedium,
  CheckCircle2,
} from "lucide-react";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { adminApi } from "../../../api/admin.api";
import { usersApi } from "../../../api/users.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function AttendanceCorrectionPage() {
  const showToast = useUiStore((s) => s.showToast);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [userId, setUserId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [shiftKind, setShiftKind] = useState("MORNING");

  const [clock_in, setClockIn] = useState("");
  const [clock_out, setClockOut] = useState("");
  const [notes, setNotes] = useState("");

  const [resolvedAttendance, setResolvedAttendance] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const data = await usersApi.list();
        if (mounted) {
          setUsers(data?.users || []);
        }
      } catch (e) {
        if (mounted) {
          showToast(
            e?.response?.data?.message || "Failed to load staff members",
            "error"
          );
        }
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    };

    loadUsers();

    return () => {
      mounted = false;
    };
  }, [showToast]);

  const selectedUser = useMemo(
    () => users.find((u) => String(u.id) === String(userId)) || null,
    [users, userId]
  );

  const resetResolvedAttendance = () => {
    setResolvedAttendance(null);
  };

  const findAttendance = async () => {
    if (!userId) {
      showToast("Select a staff member", "error");
      return;
    }

    if (!attendanceDate) {
      showToast("Select attendance date", "error");
      return;
    }

    setLookupBusy(true);
    try {
      const data = await adminApi.findAttendanceRecord({
        user_id: Number(userId),
        date: attendanceDate,
        shift_kind: shiftKind,
      });

      setResolvedAttendance(data?.attendance || null);

      if (!data?.attendance) {
        showToast("No attendance record found for that user/date/shift", "error");
        return;
      }

      showToast("Attendance record found", "success");
    } catch (e) {
      setResolvedAttendance(null);
      showToast(
        e?.response?.data?.message || "Could not find attendance record",
        "error"
      );
    } finally {
      setLookupBusy(false);
    }
  };

  const submit = async () => {
    if (!resolvedAttendance?.id) {
      showToast("Find the attendance record first", "error");
      return;
    }

    if (!clock_in && !clock_out && !notes.trim()) {
      showToast("Add at least one correction field", "error");
      return;
    }

    setBusy(true);
    try {
      const payload = {};

      if (clock_in) payload.clock_in = new Date(clock_in).toISOString();
      if (clock_out) payload.clock_out = new Date(clock_out).toISOString();
      if (notes.trim()) payload.notes = notes.trim();

      await adminApi.patchAttendance(Number(resolvedAttendance.id), payload);

      showToast("Attendance updated successfully", "success");

      setClockIn("");
      setClockOut("");
      setNotes("");
      setResolvedAttendance(null);
      setUserId("");
      setAttendanceDate("");
      setShiftKind("MORNING");
    } catch (e) {
      const msg = e?.response?.data?.message || "Patch failed";
      showToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/40 text-red-400">
          <ShieldCheck size={22} />
        </div>

        <div>
          <div className="text-lg font-semibold text-white">Attendance Correction</div>
          <div className="mt-1 text-sm text-brand-text/65">
            Locate a staff attendance record by employee, date, and shift, then apply a
            controlled admin correction.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/25 p-4 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
          Record Lookup
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <Users size={16} className="text-brand-blue" />
            <span>Staff Member</span>
          </div>

          <select
            className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3 text-brand-text outline-none transition-all duration-200 focus:border-brand-blue/60 focus:bg-brand-bg/40 focus:ring-2 focus:ring-brand-blue/20"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              resetResolvedAttendance();
            }}
            disabled={loadingUsers || lookupBusy || busy}
          >
            <option value="">
              {loadingUsers ? "Loading staff members..." : "Select staff member"}
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                #{user.id} — {user.full_name} ({user.role})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              <CalendarDays size={16} className="text-emerald-400" />
              <span>Attendance Date</span>
            </div>
            <Input
              type="date"
              value={attendanceDate}
              onChange={(e) => {
                setAttendanceDate(e.target.value);
                resetResolvedAttendance();
              }}
              className="w-full"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
              {shiftKind === "NIGHT" ? (
                <MoonStar size={16} className="text-amber-300" />
              ) : (
                <SunMedium size={16} className="text-amber-300" />
              )}
              <span>Shift Kind</span>
            </div>

            <select
              className="w-full rounded-2xl border border-brand-line bg-brand-card px-4 py-3 text-brand-text outline-none transition-all duration-200 focus:border-brand-blue/60 focus:bg-brand-bg/40 focus:ring-2 focus:ring-brand-blue/20"
              value={shiftKind}
              onChange={(e) => {
                setShiftKind(e.target.value);
                resetResolvedAttendance();
              }}
              disabled={lookupBusy || busy}
            >
              <option value="MORNING">Morning Shift</option>
              <option value="NIGHT">Night Shift</option>
            </select>
          </div>
        </div>

        <Button
          type="button"
          disabled={lookupBusy || busy || loadingUsers}
          onClick={findAttendance}
          className="w-full flex items-center justify-center gap-2"
        >
          <Search size={16} />
          {lookupBusy ? "Finding Record..." : "Find Attendance Record"}
        </Button>

        {resolvedAttendance && (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <CheckCircle2 size={16} />
              <span>Attendance Record Found</span>
            </div>

            <div className="grid gap-2 text-sm text-brand-text/80 md:grid-cols-2">
              <div>
                <span className="text-brand-text/55">Attendance ID:</span>{" "}
                <span className="font-semibold text-white">
                  {resolvedAttendance.id}
                </span>
              </div>

              <div>
                <span className="text-brand-text/55">Staff:</span>{" "}
                <span className="font-semibold text-white">
                  {selectedUser?.full_name || `User #${resolvedAttendance.user_id}`}
                </span>
              </div>

              <div>
                <span className="text-brand-text/55">Scheduled Start:</span>{" "}
                <span className="font-semibold text-white">
                  {resolvedAttendance.scheduled_start || "—"}
                </span>
              </div>

              <div>
                <span className="text-brand-text/55">Scheduled End:</span>{" "}
                <span className="font-semibold text-white">
                  {resolvedAttendance.scheduled_end || "—"}
                </span>
              </div>

              <div>
                <span className="text-brand-text/55">Status:</span>{" "}
                <span className="font-semibold text-white">
                  {resolvedAttendance.status || "—"}
                </span>
              </div>

              <div>
                <span className="text-brand-text/55">Shift:</span>{" "}
                <span className="font-semibold text-white">{shiftKind}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/25 p-4 space-y-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand-text/55">
          Correction Details
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <Clock3 size={16} className="text-emerald-400" />
            <span>Clock In Date & Time</span>
          </div>
          <Input
            type="datetime-local"
            value={clock_in}
            onChange={(e) => setClockIn(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <Clock4 size={16} className="text-amber-300" />
            <span>Clock Out Date & Time</span>
          </div>
          <Input
            type="datetime-local"
            value={clock_out}
            onChange={(e) => setClockOut(e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <FilePenLine size={16} className="text-red-400" />
            <span>Correction Reason</span>
          </div>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe why you are patching this record..."
          />
        </div>

        <div className="pt-1">
          <Button
            disabled={busy || lookupBusy || !resolvedAttendance?.id}
            onClick={submit}
            className="w-full flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {busy ? "Applying Correction..." : "Save Correction"}
          </Button>
        </div>
      </div>
    </Card>
  );
}