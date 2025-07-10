import fs from "fs";
import path from "path";
import { parseResumePDF } from "../config/GeminiModel.js";

export async function handleParseResume(req, res) {
  try {
    console.log('HEADERS:', req.headers['content-type']);
console.log('BODY:', req.body);
console.log('FILE:', req.file);
    console.log("Received file:", req.file);
    if (!req.file) throw new Error("Resume PDF not provided");
    const jsonText = await parseResumePDF(req.file.path);
    fs.unlinkSync(req.file.path);
    const data = jsonText;
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
