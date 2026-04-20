import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

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