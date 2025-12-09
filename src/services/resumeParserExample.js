import fs from "fs";
import path from "path";
import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {extractTextFromPDF} from "../utils/ocrHelper.js";

// Initialize the AI client
const ai = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parseResumePDF123(filePath) {
     try {
    const rawText = await extractTextFromPDF(filePath);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { text: "Parse this resume text into structured JSON with fields: personalInfo, experienceDetails, educationDetails, work, noticePeriod." },
        { text: rawText }
      ],
      config: { responseMimeType: "application/json" }
    });

    const jsonStr = response.candidates[0].content.parts[0].text;
    return JSON.parse(jsonStr);
  } catch (err) {
    throw new Error("Parsing failed: " + err.message);
  }
}