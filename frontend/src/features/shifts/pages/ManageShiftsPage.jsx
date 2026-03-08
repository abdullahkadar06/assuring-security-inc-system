import { useEffect, useState } from "react";
import {
  Clock3,
  PlusCircle,
  UserRoundCheck,
  Sunrise,
  MoonStar,
  CheckCircle2,
} from "lucide-react";
import Card from "../../../components/ui/Card";
import Loader from "../../../components/ui/Loader";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { shiftsApi } from "../../../api/shifts.api";
import { useUiStore } from "../../../state/ui/ui.store";
import ShiftForm from "../components/ShiftForm";
import AssignShiftForm from "../components/AssignShiftForm";

export default function ManageShiftsPage() {
  const showToast = useUiStore((s) => s.showToast);

  const [busy, setBusy] = useState(true);
  const [items, setItems] = useState([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState(null);

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

  const onSelectTemplate = (shift) => {
    setSelectedTemplate((prev) => (prev?.id === shift.id ? null : shift));
  };

  const onOpenCreate = () => {
    setOpenCreate(true);
  };

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
          <Button onClick={onOpenCreate}>Create Shift</Button>
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
          {items.map((s) => {
            const isNight = String(s.code || "").toUpperCase().includes("NIGHT");
            const isMorning = String(s.code || "").toUpperCase().includes("MORNING");
            const isSelected = selectedTemplate?.id === s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectTemplate(s)}
                className="block w-full text-left"
              >
                <Card
                  className={[
                    "transition-all duration-200 hover:-translate-y-[2px] hover:shadow-soft",
                    isSelected
                      ? "border-brand-blue shadow-soft ring-1 ring-brand-blue/50 bg-brand-blue/10"
                      : "hover:border-brand-blue/60",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        "flex h-11 w-11 items-center justify-center rounded-2xl border bg-brand-bg/35",
                        isSelected ? "border-brand-blue/70" : "border-brand-line/70",
                      ].join(" ")}
                    >
                      {isNight ? (
                        <MoonStar size={20} className="text-indigo-300" />
                      ) : isMorning ? (
                        <Sunrise size={20} className="text-amber-300" />
                      ) : (
                        <Clock3 size={20} className="text-brand-blue" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">
                            {s.name} ({s.code})
                          </div>

                          <div className="mt-2 text-sm text-brand-text/75">
                            {s.start_time} → {s.end_time}
                          </div>

                          <div className="mt-1 text-sm text-brand-text/60">
                            Grace: before {s.grace_before_minutes}m / after {s.grace_after_minutes}m
                            {" | "}
                            Active: {String(s.is_active)}
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-brand-blue/70 bg-brand-blue/15 text-brand-blue">
                            <CheckCircle2 size={18} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={openCreate} title="Create Shift" onClose={() => setOpenCreate(false)}>
        <ShiftForm
          mode="create"
          initialData={selectedTemplate}
          onSaved={async () => {
            setOpenCreate(false);
            setSelectedTemplate(null);
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