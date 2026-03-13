import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import { shiftsApi } from "../../../api/shifts.api";
import { useUiStore } from "../../../state/ui/ui.store";
import { formatShiftOption } from "../../../utils/shiftFormatter";

export default function AssignShiftModal({
  open,
  onClose,
  onAssigned,
  selectedUser = null,
}) {
  const showToast = useUiStore((s) => s.showToast);

  const [busy, setBusy] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [shiftId, setShiftId] = useState("");

  useEffect(() => {
    if (!open) return;

    let active = true;

    const loadShifts = async () => {
      try {
        setLoadingShifts(true);
        const res = await shiftsApi.list();
        if (!active) return;
        setShifts(res?.shifts || []);
      } catch (e) {
        showToast(
          e?.response?.data?.message || "Failed to load shifts",
          "error"
        );
      } finally {
        if (active) setLoadingShifts(false);
      }
    };

    loadShifts();

    return () => {
      active = false;
    };
  }, [open, showToast]);

  useEffect(() => {
    if (!open) return;
    setShiftId(selectedUser?.shift_id ? String(selectedUser.shift_id) : "");
  }, [open, selectedUser]);

  const activeShifts = useMemo(
    () => shifts.filter((s) => s.is_active !== false),
    [shifts]
  );

  const handleAssign = async () => {
    if (!selectedUser?.id) {
      showToast("No user selected", "error");
      return;
    }

    if (!shiftId) {
      showToast("Please select a shift", "error");
      return;
    }

    try {
      setBusy(true);

      await shiftsApi.assign({
        user_id: selectedUser.id,
        shift_id: Number(shiftId),
      });

      showToast("Shift assigned successfully", "success");

      if (onAssigned) {
        await onAssigned();
      }

      onClose?.();
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Failed to assign shift",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title="Assign Shift" onClose={onClose}>
      {loadingShifts ? (
        <Loader label="Loading shifts..." />
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-semibold text-brand-text/75">
              Employee
            </div>
            <Input
              value={selectedUser?.full_name || ""}
              disabled
              readOnly
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-brand-text/75">
              Select Shift
            </div>

            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              className="w-full rounded-2xl border border-brand-line/70 bg-brand-bg/40 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-blue"
            >
              <option value="" className="bg-slate-900">
                Choose shift
              </option>

              {activeShifts.map((shift) => (
                <option
                  key={shift.id}
                  value={shift.id}
                  className="bg-slate-900"
                >
                  {formatShiftOption(shift)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="bg-transparent border-brand-line text-brand-text"
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={busy || !shiftId}
              onClick={handleAssign}
            >
              {busy ? "Assigning..." : "Assign Shift"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}