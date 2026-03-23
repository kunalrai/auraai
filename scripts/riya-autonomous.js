#!/usr/bin/env node
import 'dotenv/config';

const CONVEX_URL = process.env.CONVEX_URL;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const POLL_INTERVAL = 30000;
const MY_NAME = 'Riya';

if (!CONVEX_URL || !ANTHROPIC_KEY) {
  console.error('[Riya Poller] Missing CONVEX_URL or ANTHROPIC_API_KEY in .env');
  process.exit(1);
}

let lastSeenMsgId = null;
let heartbeatInterval = null;

async function convexQuery(action, args = {}) {
  try {
    const res = await fetch(`${CONVEX_URL}/api/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    return await res.json();
  } catch (err) {
    console.error(`[Convex] Query ${action} failed:`, err.message);
    return null;
  }
}

async function convexMutation(action, args = {}) {
  try {
    const res = await fetch(`${CONVEX_URL}/api/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    return await res.json();
  } catch (err) {
    console.error(`[Convex] Mutation ${action} failed:`, err.message);
    return null;
  }
}

async function getNewMessages(messages) {
  if (!lastSeenMsgId) {
    return messages.length > 0 ? [] : [];
  }
  const idx = messages.findIndex(m => m._id === lastSeenMsgId);
  if (idx <= 0) return [];
  return messages.slice(0, idx).reverse();
}

async function getContext(messages) {
  const recent = messages.slice(0, 20).reverse();
  return recent.map(m => `${m.author}: ${m.body}`).join('\n');
}

async function askClaude(messages, goal) {
  const context = await getContext(messages);
  
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are Riya, a Frontend Developer on the Aura AI team. You communicate ONLY via the Convex message feed.\n\nYour rules:\n1. Before working: claimGoal/claimMyGoal + post "Starting goal #N: [title]"\n2. After working: markDone + post "Goal #N complete: [title]"\n3. Keep board updated at all times\n4. Be concise — short messages, max 2-3 sentences\n5. If no active work, respond briefly to Michel's messages\n\nRecent messages:\n${context}\n\n${goal ? `Your assigned goal:\nTitle: ${goal.title}\nSpec: ${goal.spec}` : ''}\n\nRespond with a JSON object only (no other text):\n{"action": "post", "body": "your message here"}\n\nOR if you need to work on a goal:\n{"action": "work", "goalNumber": N, "body": "Starting goal #N: [title]"}\n\nOR if goal is done:\n{"action": "done", "goalNumber": N, "body": "Goal #N complete: [title]"}\n\nOR if no action needed:\n{"action": "none"}`,
        },
      ],
    }),
  });
  
  const data = await res.json();
  const text = data.content?.[0]?.text || '{}';
  
  try {
    return JSON.parse(text);
  } catch {
    return { action: 'none' };
  }
}

async function handleNewMessage(msg, messages) {
  if (msg.author === MY_NAME) return;
  
  console.log(`[Riya] New ${msg.author} message: "${msg.body.substring(0, 80)}..."`);
  
  if (msg.author === 'Michel') {
    const goals = await convexQuery('goals/listGoals') || [];
    const myQueued = goals.find(g => 
      (g.assignee === MY_NAME || !g.assignee) && g.status === 'QUEUED'
    );
    const myActive = goals.find(g => 
      (g.assignee === MY_NAME || !g.assignee) && g.status === 'ACTIVE'
    );
    
    const goal = myActive || myQueued || null;
    const response = await askClaude(messages, goal);
    
    if (response.action === 'post') {
      await convexMutation('messages/postMessage', { author: MY_NAME, body: response.body });
      console.log(`[Riya] Posted: "${response.body}"`);
    } else if (response.action === 'work') {
      await convexMutation('goals/claimGoal', { goalNumber: response.goalNumber, worker: MY_NAME });
      await convexMutation('messages/postMessage', { author: MY_NAME, body: response.body });
      console.log(`[Riya] Working on goal #${response.goalNumber}`);
    } else if (response.action === 'done') {
      await convexMutation('goals/markDone', { goalNumber: response.goalNumber });
      await convexMutation('messages/postMessage', { author: MY_NAME, body: response.body });
      console.log(`[Riya] Goal #${response.goalNumber} marked done`);
    }
  }
}

async function sendHeartbeat() {
  await convexMutation('agents/heartbeat', { name: MY_NAME });
}

async function poll() {
  const messages = await convexQuery('messages/listMessages');
  if (!messages || !Array.isArray(messages)) return;
  
  const latest = messages[0];
  if (latest && latest._id !== lastSeenMsgId) {
    lastSeenMsgId = latest._id;
    
    const newMsgs = await getNewMessages(messages);
    for (const msg of newMsgs) {
      await handleNewMessage(msg, messages);
    }
  }
}

async function main() {
  console.log('[Riya Poller] Starting...');
  console.log(`[Riya Poller] Convex: ${CONVEX_URL}`);
  
  setInterval(poll, POLL_INTERVAL);
  heartbeatInterval = setInterval(sendHeartbeat, 60000);
  
  await sendHeartbeat();
  await poll();
  
  console.log(`[Riya Poller] Listening — polling every ${POLL_INTERVAL / 1000}s`);
  console.log('[Riya Poller] Press Ctrl+C to stop\n');
}

main().catch(console.error);
