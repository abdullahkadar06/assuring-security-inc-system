import { autoCloseDueAttendances } from "../services/attendanceEngine.service.js";

let started = false;
let timer = null;

export function startAttendanceAutoCloseJob() {
  if (started) return;

  started = true;

  const run = async () => {
    try {
      await autoCloseDueAttendances();
    } catch (e) {
      console.error("attendanceAutoClose.job error:", e);
    }
  };

  run();
  timer = setInterval(run, 15 * 1000);

  console.log("🤖 Attendance auto-close job started (every 15 seconds)");
}

export function stopAttendanceAutoCloseJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  started = false;
}