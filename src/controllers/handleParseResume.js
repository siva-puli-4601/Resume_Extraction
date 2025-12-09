import fs from "fs";
import path from "path";
import { parseResumePDF } from "../config/GeminiModel.js";
import { parseResumePDF123 } from "../services/resumeParserExample.js";
import processResumeFile from "../services/resumeParser.js";

export async function handleParseResume(req, res) {
  try {
    if (!req.file) throw new Error("Resume PDF not provided");
    const jsonText = await processResumeFile(req.file.path);
    fs.unlinkSync(req.file.path);
    const data = jsonText;
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
