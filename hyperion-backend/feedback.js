import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const timestamp = new Date().toISOString();
    const feedbackEntry = {
      id: Date.now(),
      date: timestamp,
      from: email || "Anonymous",
      msg: message
    };

    // Replace fs.appendFile with a Redis list push
    // This adds the feedback to a list named 'hyperion_feedback'
    await kv.lpush('hyperion_feedback', JSON.stringify(feedbackEntry));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("KV Error:", error);
    return res.status(500).json({ error: "Failed to save feedback" });
  }
}