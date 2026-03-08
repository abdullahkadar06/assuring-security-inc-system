import { useEffect, useState } from "react";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { shiftsApi } from "../../../api/shifts.api";
import { useUiStore } from "../../../state/ui/ui.store";

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

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code || "");
      setName(initialData.name || "");
      setStart(initialData.start_time || "");
      setEnd(initialData.end_time || "");
      return;
    }

    setCode("");
    setName("");
    setStart("");
    setEnd("");
  }, [initialData]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      const payload = {
        code,
        name,
        start_time,
        end_time,
      };

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
      <div>
        <div className="mb-1 text-sm text-brand-text/70">Code</div>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="MORNING"
        />
      </div>

      <div>
        <div className="mb-1 text-sm text-brand-text/70">Name</div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Morning Shift"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 text-sm text-brand-text/70">Start</div>
          <Input
            type="time"
            value={start_time}
            onChange={(e) => setStart(e.target.value)}
            placeholder="08:00"
          />
        </div>

        <div>
          <div className="mb-1 text-sm text-brand-text/70">End</div>
          <Input
            type="time"
            value={end_time}
            onChange={(e) => setEnd(e.target.value)}
            placeholder="16:00"
          />
        </div>
      </div>

      <Button disabled={busy}>
        {busy ? "Saving..." : mode === "edit" ? "Update Shift" : "Save"}
      </Button>
    </form>
  );
}