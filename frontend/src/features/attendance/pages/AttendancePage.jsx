import TodaySummaryCard from "../components/TodaySummaryCard";
import CheckInButton from "../components/CheckInButton";
import CheckOutButton from "../components/CheckOutButton";

export default function AttendancePage() {
  return (
    <div className="space-y-3">
      <TodaySummaryCard />
      <CheckInButton />
      <CheckOutButton />
    </div>
  );
}