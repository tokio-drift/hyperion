import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(cors());
app.use(express.json());
app.use('/api/help', express.static(path.join(__dirname, 'docs')))
app.use('/assets', express.static(path.join(__dirname, '../frontend/dist/assets')));

app.get("/api/edit", (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.post("/api/feedback", (req, res) => {
  const { email, message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const timestamp = new Date().toLocaleString();
  const entry = `ID: ${Date.now()}\nDATE: ${timestamp}\nFROM: ${email || "Anonymous"}\nMSG: ${message}\n${"=".repeat(20)}\n`;

  const filePath = path.join(process.cwd(), "feedback.txt");

  fs.appendFile(filePath, entry, (err) => {
    if (err) {
      console.error("Write error:", err);
      return res.status(500).json({ error: "Could not write to file" });
    }
    console.log("Feedback saved to feedback.txt");
    res.status(200).json({ success: true });
  });
});

app.listen(5000, () => console.log("Feedback server running on port 5000"));