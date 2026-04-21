// /api/feedback.js — Vercel serverless function
// On Vercel: uses @vercel/kv (Redis) to store feedback
// On localhost: this file is NOT used — Express server.js handles it instead

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS headers (needed if frontend is on a different origin during dev)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      from: email || 'Anonymous',
      msg: message,
    };

    await kv.lpush('hyperion_feedback', JSON.stringify(entry));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('KV Error:', error);
    return res.status(500).json({ error: 'Failed to save feedback' });
  }
}
