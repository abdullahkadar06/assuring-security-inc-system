import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import Card from "../../../components/ui/Card";
import Loader from "../../../components/ui/Loader";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { usersApi } from "../../../api/users.api";
import { useUiStore } from "../../../state/ui/ui.store";
import UserForm from "../components/UserForm";
import UserTable from "../components/UserTable";

export default function UsersPage() {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState(true);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const d = await usersApi.list();
      setUsers(d?.users || []);
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Could not load users",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (busy) return <Loader label="Fetching employees..." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 shadow-lg shadow-brand-blue/20"
        >
          <UserPlus size={18} />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      {users.length === 0 ? (
        <Card className="py-10 text-center text-brand-text/50">
          No employees found in the database.
        </Card>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-brand-line/70 bg-brand-card/25 p-2 shadow-xl">
          <UserTable rows={users} reload={load} />
        </div>
      )}

      <Modal
        open={open}
        title="Register New Employee"
        onClose={() => setOpen(false)}
      >
        <UserForm
          onSaved={async () => {
            setOpen(false);
            await load();
          }}
        />
      </Modal>
    </div>
  );
}