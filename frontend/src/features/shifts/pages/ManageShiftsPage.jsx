import { useEffect, useState } from "react";
import {
  Clock3,
  PlusCircle,
  UserRoundCheck,
  Sunrise,
  MoonStar,
} from "lucide-react";
import Card from "../../../components/ui/Card";
import Loader from "../../../components/ui/Loader";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { shiftsApi } from "../../../api/shifts.api";
import { useUiStore } from "../../../state/ui/ui.store";
import ShiftForm from "../components/ShiftForm";
import ShiftCard from "../components/ShiftCard";
import AssignShiftForm from "../components/AssignShiftForm";

export default function ManageShiftsPage() {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(true);
  const [items, setItems] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const d = await shiftsApi.list();
      setItems(d?.shifts || []);
    } catch (e) {
      showToast(e?.response?.data?.message || "Shifts load failed", "error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (busy) return <Loader label="Loading shifts..." />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-line/70 bg-brand-card/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/40 text-amber-400">
            <Clock3 size={22} />
          </div>

          <div>
            <div className="text-lg font-semibold text-white">Shift Management</div>
            <div className="mt-1 text-sm text-brand-text/65">
              Create, review, and assign work shifts professionally.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <PlusCircle size={16} className="text-brand-blue" />
            <span>Create Shift</span>
          </div>
          <Button onClick={() => setOpenCreate(true)}>Create Shift</Button>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-text/75">
            <UserRoundCheck size={16} className="text-red-400" />
            <span>Assign Shift</span>
          </div>
          <Button
            className="bg-brand-red border-brand-red"
            onClick={() => setOpenAssign(true)}
          >
            Assign Shift
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>No shifts found.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id} className="transition-all duration-200 hover:border-brand-blue/50">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/35">
                  {String(s.code || "").toUpperCase().includes("NIGHT") ? (
                    <MoonStar size={20} className="text-indigo-300" />
                  ) : (
                    <Sunrise size={20} className="text-amber-300" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-white">
                    {s.name} ({s.code})
                  </div>

                  <div className="mt-2 text-sm text-brand-text/75">
                    {s.start_time} → {s.end_time}
                  </div>

                  <div className="mt-1 text-sm text-brand-text/60">
                    Grace: before {s.grace_before_minutes}m / after {s.grace_after_minutes}m
                    {" "} | {" "}
                    Active: {String(s.is_active)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={openCreate} title="Create Shift" onClose={() => setOpenCreate(false)}>
        <ShiftForm
          onSaved={async () => {
            setOpenCreate(false);
            await load();
          }}
        />
      </Modal>

      <Modal open={openAssign} title="Assign Shift to User" onClose={() => setOpenAssign(false)}>
        <AssignShiftForm onAssigned={() => setOpenAssign(false)} />
      </Modal>
    </div>
  );
}