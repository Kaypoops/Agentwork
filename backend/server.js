import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3001;

// Supabase client (service key — full access, server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(cors());
app.use(express.json());

/* ─────────────────────────────────────────────
   TASKS
───────────────────────────────────────────── */

// GET /api/tasks — list all open tasks
app.get('/api/tasks', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, bids(*)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/tasks/:id — single task with bids
app.get('/api/tasks/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, bids(*)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Task not found' });
  res.json(data);
});

// POST /api/tasks — create a new task
app.post('/api/tasks', async (req, res) => {
  const { title, description, category, bounty, deadline, poster_address, poster_nametag } = req.body;

  if (!title || !description || !bounty || !poster_address) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      category: category || 'research',
      bounty: parseInt(bounty),
      deadline: deadline || '6 hours',
      poster_address,
      poster_nametag: poster_nametag || poster_address.slice(0, 12) + '…',
      status: 'open',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/tasks/:id/complete — mark task complete
app.patch('/api/tasks/:id/complete', async (req, res) => {
  const { winner_address, winner_nametag, tx_id } = req.body;

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      winner_address,
      winner_nametag,
      tx_id,
      completed_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ─────────────────────────────────────────────
   BIDS
───────────────────────────────────────────── */

// GET /api/tasks/:id/bids — all bids for a task
app.get('/api/tasks/:id/bids', async (req, res) => {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('task_id', req.params.id)
    .order('amount', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/tasks/:id/bids — place a bid
app.post('/api/tasks/:id/bids', async (req, res) => {
  const { agent_address, agent_nametag, amount } = req.body;

  if (!agent_address || !amount) {
    return res.status(400).json({ error: 'Missing agent_address or amount' });
  }

  // Check task is still open
  const { data: task } = await supabase
    .from('tasks')
    .select('status, bounty')
    .eq('id', req.params.id)
    .single();

  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.status !== 'open') return res.status(400).json({ error: 'Task is no longer open' });
  if (amount > task.bounty) return res.status(400).json({ error: 'Bid exceeds bounty amount' });

  const { data, error } = await supabase
    .from('bids')
    .insert({
      task_id: req.params.id,
      agent_address,
      agent_nametag: agent_nametag || agent_address.slice(0, 12) + '…',
      amount: parseInt(amount),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/* ─────────────────────────────────────────────
   ACTIVITY FEED
───────────────────────────────────────────── */

// GET /api/activity — latest 20 events
app.get('/api/activity', async (req, res) => {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/activity — log an event
app.post('/api/activity', async (req, res) => {
  const { type, text, color } = req.body;

  const { data, error } = await supabase
    .from('activity')
    .insert({ type, text, color })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

/* ─────────────────────────────────────────────
   AGENT WEBHOOK — called by the AI agent
───────────────────────────────────────────── */

// POST /api/agent/claim — agent claims a task and starts working
app.post('/api/agent/claim', async (req, res) => {
  const { task_id, agent_address, agent_nametag } = req.body;

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'in_progress', agent_address, agent_nametag })
    .eq('id', task_id)
    .eq('status', 'open')
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(400).json({ error: 'Task not available' });
  res.json(data);
});

// POST /api/agent/deliver — agent submits completed work
app.post('/api/agent/deliver', async (req, res) => {
  const { task_id, result, agent_address } = req.body;

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'delivered',
      result,
      delivered_at: new Date().toISOString(),
    })
    .eq('id', task_id)
    .eq('agent_address', agent_address)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ─────────────────────────────────────────────
   HEALTH CHECK
───────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    network: 'testnet2',
    sdk: '@unicitylabs/sphere-sdk@0.10.3',
  });
});

app.listen(PORT, () => {
  console.log(`✅ AgentWork API running on http://localhost:${PORT}`);
  console.log(`📡 Connected to Supabase: ${process.env.SUPABASE_URL}`);
});
