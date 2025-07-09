import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

export async function parseResumePDF(filePath) {
  try {
    const currentYear = new Date().getFullYear();
    const pdfBuffer = fs.readFileSync(filePath);
    console.log("PDF file read successfully, size:", pdfBuffer);
    const prompt = `
You are an expert resume parser.

Extract and return a structured JSON object from the provided resume text. Always include all fields listed below. If a field is missing, use an empty string or empty array.
Rules:
- Sort by most recent first
- toDate="Present" means currently active
- Any past date (lesser then current year) means ended
- Exclude internships from experience calculation
- Return valid JSON only
JSON FORMAT:
{
  "personalInfo": {
    "fullName": "",          
    "firstName": "",          // First part of full name only (e.g., "Jon Dev Bravo" → "Jon"). Ignore titles (Dr., Mr.) and suffixes (Jr., Sr.)
    "middleName": "",         // Middle part of name (e.g., "Jon Dev Bravo" → "Dev"). Leave empty if no middle name
    "lastName": "",           // Last part of name (e.g., "Jon Dev Bravo" → "Bravo"). If only one name, put in firstName
    "gender": "",             
   "email": "",               // Extract ONLY the first email found in resume
    "phoneNumber": "",        // Extract ONLY the first phone number found in resume        
    "linkedinProfile": "",    // Extract full LinkedIn profile URL
    "country": "",            
    "state": "",              
    "city": ""                
  },
   "experienceDetails": [
    {
      "organization": "",       
      "designation": "",       
      "country": "",           
      "state": "",              
       "employeeType": "",      // Map based on location: USA → "C2C"/"W2"/"1099" | India → "Full Time"/"Contract"/"Contract to Hire"/"Part time contract"/"Part time - On demand" | Match exact strings, default "Full Time"
      "fromDate": "",           // Start date (format: YYYY-MM or any readable form)
      "toDate": "",             // End date or "Present"
      "skillsUsed": []          
    }
  ],
  "educationDetails": [
    {
      "degree": "",             
      "specialization": "",    
      "institution": "",        
      "year": "",              
      "gradeOrScore": ""       
    }
  ]
  "work": {
    "currentStatus": "",         // STRICT: Step 1: Notice period keywords → "Notice Period" | Step 2:Strictly Most recent job toDate EXACTLY "Present" AND NOT intern → "Employed" | Step 3: Strictly Most recent education  Year EXACTLY "Present" or its  Year is strictly greater than the>${currentYear} → "Graduating" | Step 4: if no steps satisfy before Default → "Unemployed"
    "experienceInYears": "",    // Calculate experience in years EXCLUDING internships. Convert to decimal years if needed like 2.11 years it means he worked for 2 years and 11 months. Need both fromDate and toDate. Examples: "1.5", "0.8", "2.2". CRITICAL: Handle overlapping employment - if candidate worked at multiple companies simultaneously (e.g., ABC: 2015-2017, XYZ: 2015-2017), merge overlapping periods first then sum (result: 2.0 years, NOT 4.0 years). Only count actual working periods, ignore unemployment gaps.
    "skills": [],              
    "currentLocation": "",     
    "currentEmployer": "",             
    "designation": "",         
  },
 
}
`;

    console.log("Parsing resume from PDF...");

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBuffer.toString("base64")
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    console.log("Response received from Gemini:", response);
    const text = response.text();
    try {
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      cleanedText = cleanedText.trim();

      // Try to parse as JSON
      const parsedData = JSON.parse(cleanedText);
      console.log("Successfully parsed JSON response", parsedData);
      return parsedData;
    } catch (parseError) {
      console.warn("Failed to parse response as JSON, returning raw text:", parseError.message);
      return text;
    }

  } catch (error) {
    console.error("Error parsing resume:", error);
    throw error;
  }
}
