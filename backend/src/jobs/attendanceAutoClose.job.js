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

  // startup-ka markiiba ha baaro records-kii hore overdue u ahaa
  run();

  // kadib 1 minute kasta
  timer = setInterval(run, 60 * 1000);

  console.log("🤖 Attendance auto-close job started (every 1 minute)");
}

export function stopAttendanceAutoCloseJob() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  started = false;
}