import { useEffect, useState } from "react";
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
      showToast(e?.response?.data?.message || "Users load failed", "error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (busy) return <Loader label="Loading users..." />;

  return (
    <div className="space-y-3">
      <Button onClick={() => setOpen(true)}>Create User</Button>
      {users.length === 0 ? <Card>No users.</Card> : <UserTable rows={users} />}

      <Modal open={open} title="Create User" onClose={() => setOpen(false)}>
        <UserForm onSaved={async () => { setOpen(false); await load(); }} />
      </Modal>
    </div>
  );
}