import { useEffect, useState } from "react";
import {
  Clock3,
  PlusCircle,
  UserRoundCheck,
  Sunrise,
  MoonStar,
  Pencil,
  Trash2,
} from "lucide-react";

import Card from "../../../components/ui/Card";
import Loader from "../../../components/ui/Loader";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";

import { shiftsApi } from "../../../api/shifts.api";
import { useUiStore } from "../../../state/ui/ui.store";

import ShiftForm from "../components/ShiftForm";
import AssignShiftForm from "../components/AssignShiftForm";

function normalizeTime(v = "") {
  return String(v).slice(0, 5);
}

function getShiftMeta(code = "") {
  const upper = String(code).toUpperCase();

  if (upper.includes("MORNING")) {
    return {
      icon: <Sunrise size={20} className="text-amber-300" />,
      badge: "Morning",
      badgeClass:
        "border-amber-400/30 bg-amber-500/10 text-amber-200",
    };
  }

  if (upper.includes("NIGHT")) {
    return {
      icon: <MoonStar size={20} className="text-indigo-300" />,
      badge: "Night",
      badgeClass:
        "border-indigo-400/30 bg-indigo-500/10 text-indigo-200",
    };
  }

  return {
    icon: <Clock3 size={20} className="text-brand-blue" />,
    badge: "Custom",
    badgeClass:
      "border-brand-blue/30 bg-brand-blue/10 text-brand-text/85",
  };
}

export default function ManageShiftsPage() {
  const showToast = useUiStore((s) => s.showToast);

  const [busy, setBusy] = useState(true);
  const [items, setItems] = useState([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [editingShift, setEditingShift] = useState(null);

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

  const onDelete = async (shift) => {
    const ok = window.confirm(`Delete shift "${shift.name}"?`);
    if (!ok) return;

    try {
      await shiftsApi.remove(shift.id);
      showToast("Shift deleted", "success");
      await load();
    } catch (e) {
      showToast(e?.response?.data?.message || "Delete failed", "error");
    }
  };

  const openEditModal = (shift) => {
    setEditingShift(shift);
    setOpenEdit(true);
  };

  if (busy) return <Loader label="Loading shifts..." />;

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-brand-line/70 bg-brand-card/30 p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/40 text-amber-400">
            <Clock3 size={22} />
          </div>

          <div className="min-w-0">
            <div className="text-lg font-semibold text-white">
              Shift Management
            </div>
            <div className="mt-1 text-sm leading-6 text-brand-text/65">
              Create, review, edit, and assign work shifts professionally.
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
            className="border-brand-red bg-brand-red hover:bg-red-600"
            onClick={() => setOpenAssign(true)}
          >
            Assign Shift
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="text-center text-brand-text/70">No shifts found.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((s) => {
            const meta = getShiftMeta(s.code);

            return (
              <Card
                key={s.id}
                className="rounded-[28px] border-brand-line/70 bg-brand-card/35 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-line/70 bg-brand-bg/35">
                    {meta.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-[15px] font-semibold text-white">
                        {s.name} ({s.code})
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.badgeClass}`}
                      >
                        {meta.badge}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          s.is_active
                            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                            : "border-red-400/30 bg-red-500/10 text-red-200"
                        }`}
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-3 text-sm text-brand-text/78">
                      {normalizeTime(s.start_time)} → {normalizeTime(s.end_time)}
                    </div>

                    <div className="mt-1 text-sm text-brand-text/60">
                      Grace: before {s.grace_before_minutes}m / after{" "}
                      {s.grace_after_minutes}m
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(s)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-blue/40 bg-brand-blue/10 text-brand-blue transition-all duration-200 hover:-translate-y-[1px] hover:border-brand-blue/70 hover:bg-brand-blue/20"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(s)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/35 bg-red-500/10 text-red-300 transition-all duration-200 hover:-translate-y-[1px] hover:bg-red-500/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={openCreate}
        title="Create Shift"
        onClose={() => setOpenCreate(false)}
      >
        <div className="max-h-[72vh] overflow-y-auto pr-1">
          <ShiftForm
            mode="create"
            onSaved={async () => {
              setOpenCreate(false);
              await load();
            }}
          />
        </div>
      </Modal>

      <Modal
        open={openEdit}
        title="Edit Shift"
        onClose={() => setOpenEdit(false)}
      >
        <div className="max-h-[72vh] overflow-y-auto pr-1">
          <ShiftForm
            mode="edit"
            initialData={editingShift}
            onSaved={async () => {
              setOpenEdit(false);
              await load();
            }}
          />
        </div>
      </Modal>

      <Modal
        open={openAssign}
        title="Assign Shift to User"
        onClose={() => setOpenAssign(false)}
      >
        <AssignShiftForm
          onAssigned={async () => {
            setOpenAssign(false);
            await load();
          }}
        />
      </Modal>
    </div>
  );
}