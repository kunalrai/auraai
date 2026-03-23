import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api";
import { Id } from "./convex/_generated/dataModel";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const CONVEX_URL = process.env.CONVEX_URL;
const WORKER_NAME = process.env.WORKER_NAME ?? "opencode-worker";
const POLL_INTERVAL = 15_000;

if (!CONVEX_URL) {
  console.error("[worker] Missing CONVEX_URL in env");
  process.exit(1);
}

const client = new ConvexClient(CONVEX_URL);

async function postMessage(body: string) {
  await client.mutation(api.collab.postMessage, { author: "Riya", body });
}

async function processGoal(goal: {
  _id: Id<"goals">;
  number: number;
  title: string;
  spec: string;
}) {
  console.log(`[worker] Claiming goal #${goal.number}: ${goal.title}`);

  // Mark ACTIVE then WORKING
  await client.mutation(api.goals.updateGoal, {
    id: goal._id,
    status: "ACTIVE",
    worker: WORKER_NAME,
  });
  await client.mutation(api.goals.updateGoal, {
    id: goal._id,
    status: "WORKING",
    worker: WORKER_NAME,
  });
  await postMessage(`Starting goal #${goal.number}: ${goal.title}`);

  // Build prompt from goal spec + recent messages
  const recentMsgs = await client.query(api.messages.recent, {});
  const msgContext = [...recentMsgs]
    .reverse()
    .map((m) => `${m.author}: ${m.body}`)
    .join("\n");

  const prompt = `You are an AI developer agent working on the Aura AI project.

## Goal #${goal.number}: ${goal.title}

${goal.spec}

## Recent team messages (for context)
${msgContext}

Implement the goal above. Make all necessary code changes.`;

  // Write prompt to a temp file and run opencode
  const tmpFile = path.join(os.tmpdir(), `goal-${goal.number}-prompt.md`);
  fs.writeFileSync(tmpFile, prompt, "utf-8");

  try {
    console.log(`[worker] Running opencode for goal #${goal.number}...`);
    execSync(`opencode run --file "${tmpFile}"`, {
      stdio: "inherit",
      timeout: 10 * 60 * 1000, // 10 min max
    });

    // Success
    await client.mutation(api.goals.updateGoal, {
      id: goal._id,
      status: "DONE",
      worker: WORKER_NAME,
      completedAt: Date.now(),
    });
    await postMessage(`Goal #${goal.number} complete: ${goal.title}`);
    console.log(`[worker] Goal #${goal.number} done.`);
  } catch (err) {
    // Failure — requeue
    console.error(`[worker] Goal #${goal.number} failed:`, err);
    await client.mutation(api.goals.updateGoal, {
      id: goal._id,
      status: "QUEUED",
      worker: undefined,
    });
    await postMessage(
      `Goal #${goal.number} failed and has been requeued. Error: ${(err as Error).message?.slice(0, 120)}`
    );
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

async function poll() {
  const queued = await client.query(api.goals.listQueued, {});
  if (queued.length === 0) return;

  const goal = queued[0];
  await processGoal(goal);
}

async function main() {
  console.log(`[worker] Starting — name: ${WORKER_NAME}`);
  console.log(`[worker] Convex: ${CONVEX_URL}`);
  console.log(`[worker] Polling every ${POLL_INTERVAL / 1000}s\n`);

  // Initial poll, then on interval
  await poll();
  setInterval(poll, POLL_INTERVAL);
}

main().catch((err) => {
  console.error("[worker] Fatal:", err);
  process.exit(1);
});
