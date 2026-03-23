#!/usr/bin/env node
const { fetch } = require('undici');

const CONVEX_URL = process.env.CONVEX_URL || 'https://auraai-12345.convex.cloud';
const POLL_INTERVAL = 30000; // 30 seconds

let lastSeenMsgId = null;

async function getMessages() {
  try {
    const res = await fetch(`${CONVEX_URL}/api/messages/listMessages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[Poller] Failed to fetch messages:', err.message);
    return [];
  }
}

async function sendHeartbeat(name) {
  try {
    await fetch(`${CONVEX_URL}/api/messages/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  } catch (err) {
    console.error('[Poller] Heartbeat failed:', err.message);
  }
}

async function poll() {
  const messages = await getMessages();
  if (!messages || messages.length === 0) return;

  const latest = messages[0];
  if (lastSeenMsgId && latest._id === lastSeenMsgId) return;

  lastSeenMsgId = latest._id;

  const newMichel = messages.find(
    m => m.author === 'Michel' && m._id !== lastSeenMsgId
  );

  if (newMichel) {
    console.log(`\n[ALERT] New Michel message detected:`);
    console.log(`  "${newMichel.body.substring(0, 100)}..."`);
    console.log(`  → Time: ${new Date(newMichel._creationTime).toLocaleTimeString()}\n`);
  }
}

async function main() {
  console.log('[Poller] Riya message poller started');
  console.log(`[Poller] Polling every ${POLL_INTERVAL / 1000}s`);
  console.log('[Poller] Watching for new Michel messages...\n');

  setInterval(poll, POLL_INTERVAL);
  setInterval(() => sendHeartbeat('Riya'), 60000);
  
  poll();
}

main().catch(console.error);
