import Button from "../../../components/ui/Button";
import { attendanceApi } from "../../../api/attendance.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function CheckOutButton() {
  const showToast = useUiStore((s) => s.showToast);

  const onClick = async () => {
    try {
      await attendanceApi.clockOut({});
      showToast("Clock-out successful");
    } catch (e) {
      showToast(e?.response?.data?.message || "Clock-out failed", "error");
    }
  };

  return <Button className="bg-brand-red border-brand-red" onClick={onClick}>Clock Out</Button>;
}