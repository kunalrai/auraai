import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 2 minutes: check if any goal was marked DONE without Michel activating the next.
// This is a safety net — markDone() already triggers activateNext() immediately.
crons.interval(
  "michel-watchdog",
  { minutes: 2 },
  internal.collab.activateNext,
  {}
);

export default crons;
