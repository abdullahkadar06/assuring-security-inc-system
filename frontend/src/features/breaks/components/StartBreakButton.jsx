import Button from "../../../components/ui/Button";
import { breaksApi } from "../../../api/breaks.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function StartBreakButton() {
  const showToast = useUiStore((s) => s.showToast);

  const onClick = async () => {
    try {
      await breaksApi.start({});
      showToast("Break started");
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed", "error");
    }
  };

  return <Button onClick={onClick}>Start Break</Button>;
}