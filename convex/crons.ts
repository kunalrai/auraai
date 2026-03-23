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

crons.interval(
  "riya-message-listener",
  { minutes: 1 },
  internal.collab.riyaWatchMessages,
  {}
);

export default crons;
