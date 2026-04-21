import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.post('/api/feedback', (req, res) => {
  const { email, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const timestamp = new Date().toLocaleString();
  const entry =
    `ID: ${Date.now()}\nDATE: ${timestamp}\nFROM: ${email || 'Anonymous'}\nMSG: ${message}\n${'='.repeat(20)}\n`;

  const filePath = path.join(process.cwd(), 'feedback.txt');

  fs.appendFile(filePath, entry, (err) => {
    if (err) {
      console.error('Write error:', err);
      return res.status(500).json({ error: 'Could not write to file' });
    }
    console.log('Feedback saved to feedback.txt');
    res.status(200).json({ success: true });
  });
});

const distIndex = path.join(__dirname, '../frontend/dist/index.html');

app.get('/', (_req, res) => res.redirect('/home'));
app.get('/home', (_req, res) => res.sendFile(distIndex));
app.get('/edit', (_req, res) => res.sendFile(distIndex));

app.listen(5000, () => {
  console.log('Hyperion dev server → http://localhost:5000');
  console.log('  Landing : http://localhost:5000/home');
  console.log('  Editor  : http://localhost:5000/edit');
});