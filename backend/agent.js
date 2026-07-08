/**
 * AgentWork Autonomous Agent — powered by Groq (free)
 * Track: Autonomous Agents + agentic XP bonus
 * No human in the loop — fully autonomous
 */

import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE   = process.env.API_BASE   || 'http://localhost:3001/api';
const AGENT_NAME = process.env.AGENT_NAME || '@agentwork-bot';
const AGENT_ADDR = process.env.AGENT_ADDR || '0xagent_aw_001';
const POLL_MS    = parseInt(process.env.POLL_MS || '15000');
const groq       = new Groq({ apiKey: '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' });

async function completeTask(task) {
  console.log(`\n🤖 Working on: "${task.title}"`);
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1500,
    messages: [
      { role: 'system', content: 'You are AgentWork Bot, an autonomous AI agent on the Unicity network. Complete tasks posted by humans. Be thorough and professional — your UCT payment depends on quality.' },
      { role: 'user', content: `Complete this task:\n\nTASK: ${task.title}\nCATEGORY: ${task.category}\nDESCRIPTION: ${task.description}\nBOUNTY: ${task.bounty} UCT\n\nDeliver complete, high-quality work now.` },
    ],
  });
  return completion.choices[0].message.content;
}

async function placeBid(task) {
  const amount = Math.floor(task.bounty * (0.85 + Math.random() * 0.10));
  console.log(`💰 Bidding ${amount} UCT on "${task.title}"`);
  const res = await fetch(`${API_BASE}/tasks/${task.id}/bids`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_address: AGENT_ADDR, agent_nametag: AGENT_NAME, amount }),
  });
  if (!res.ok) { console.error('Bid failed:', (await res.json()).error); return null; }
  const bid = await res.json();
  console.log(`✅ Bid placed: ${bid.amount} UCT`);
  return bid;
}

async function claimTask(taskId) {
  const res = await fetch(`${API_BASE}/agent/claim`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, agent_address: AGENT_ADDR, agent_nametag: AGENT_NAME }),
  });
  return res.ok ? res.json() : null;
}

async function deliverWork(taskId, result) {
  const res = await fetch(`${API_BASE}/agent/deliver`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, agent_address: AGENT_ADDR, result }),
  });
  return res.ok ? res.json() : null;
}

async function logActivity(type, text, color = '#4f7fff') {
  await fetch(`${API_BASE}/activity`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, text, color }),
  }).catch(() => {});
}

async function agentLoop() {
  console.log(`\n⚡ AgentWork Autonomous Agent`);
  console.log(`🤖 ${AGENT_NAME} | 🧠 llama-3.3-70b (Groq) | 📡 ${API_BASE}\n`);

  while (true) {
    try {
      const tasks = await (await fetch(`${API_BASE}/tasks`)).json();
      const open  = tasks.filter(t => t.status === 'open');
      console.log(`📋 ${open.length} open task(s)`);

      for (const task of open) {
        if (task.bids?.some(b => b.agent_address === AGENT_ADDR)) { console.log(`⏭  Already bid on "${task.title}"`); continue; }
        if (!['research','writing','data'].includes(task.category)) { console.log(`⏭  Skipping category: ${task.category}`); continue; }

        const bid = await placeBid(task);
        if (!bid) continue;

        await logActivity('bid', `<span class="hl">${AGENT_NAME}</span> bid ${bid.amount} UCT on <em>"${task.title}"</em>`, '#4f7fff');

        const claimed = await claimTask(task.id);
        if (!claimed) { console.log(`⚠️  Could not claim #${task.id}`); continue; }
        console.log(`🔒 Claimed: "${task.title}"`);

        const result = await completeTask(task);
        console.log(`✍️  Done (${result.length} chars)`);

        const delivered = await deliverWork(task.id, result);
        if (!delivered) { console.error('Delivery failed'); continue; }

        await logActivity('complete', `<span class="hl">${AGENT_NAME}</span> completed <em>"${task.title}"</em> — ${bid.amount} UCT earned`, '#2fcc8b');

        console.log(`✅ Task #${task.id} complete!\n`);
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error('Loop error:', err.message);
    }
    console.log(`💤 Next poll in ${POLL_MS/1000}s...\n`);
    await new Promise(r => setTimeout(r, POLL_MS));
  }
}

agentLoop().catch(console.error);