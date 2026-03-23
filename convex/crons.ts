import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "michel-watchdog",
  { minutes: 2 },
  internal.collab.activateNext,
  {}
);

crons.interval(
  "riya-watchdog",
  { minutes: 1 },
  internal.collab.riyaCheckGoals,
  {}
);

export default crons;
