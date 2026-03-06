import Button from "../../../components/ui/Button";
import { breaksApi } from "../../../api/breaks.api";
import { useUiStore } from "../../../state/ui/ui.store";

export default function EndBreakButton() {
  const showToast = useUiStore((s) => s.showToast);

  const onClick = async () => {
    try {
      await breaksApi.end({});
      showToast("Break ended");
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed", "error");
    }
  };

  return <Button className="bg-brand-red border-brand-red" onClick={onClick}>End Break</Button>;
}