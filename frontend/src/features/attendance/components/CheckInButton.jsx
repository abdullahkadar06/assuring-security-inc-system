import Button from "../../../components/ui/Button";
import { attendanceApi } from "../../../api/attendance.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function CheckInButton() {
  const showToast = useUiStore((s) => s.showToast);

  const onClick = async () => {
    try {
      await attendanceApi.clockIn({});
      showToast("Clock-in successful");
    } catch (e) {
      showToast(e?.response?.data?.message || "Clock-in failed", "error");
    }
  };

  return <Button onClick={onClick}>Clock In</Button>;
}