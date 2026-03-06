import { useEffect, useState } from "react";
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

  useEffect(() => { load(); }, []);

  if (busy) return <Loader label="Loading shifts..." />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => setOpenCreate(true)}>Create Shift</Button>
        <Button className="bg-brand-red border-brand-red" onClick={() => setOpenAssign(true)}>Assign Shift</Button>
      </div>

      {items.length === 0 ? (
        <Card>No shifts found.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((s) => <ShiftCard key={s.id} shift={s} />)}
        </div>
      )}

      <Modal open={openCreate} title="Create Shift" onClose={() => setOpenCreate(false)}>
        <ShiftForm onSaved={async () => { setOpenCreate(false); await load(); }} />
      </Modal>

      <Modal open={openAssign} title="Assign Shift to User" onClose={() => setOpenAssign(false)}>
        <AssignShiftForm onAssigned={() => setOpenAssign(false)} />
      </Modal>
    </div>
  );
}