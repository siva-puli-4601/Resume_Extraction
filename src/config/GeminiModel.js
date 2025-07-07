import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

export async function parseResumePDF(filePath) {
  try {
    const pdfBuffer = fs.readFileSync(filePath);
    console.log("PDF file read successfully, size:", pdfBuffer);
    const prompt = `
You are an expert resume parser.

Extract and return a structured JSON object from the provided resume text. Always include all fields listed below. If a field is missing, use an empty string or empty array.

JSON FORMAT:
{
  "personalInfo": {
    "firstName": "",          // First part of full name only (e.g., "Jon Dev Bravo" → "Jon"). Ignore titles (Dr., Mr.) and suffixes (Jr., Sr.)
    "middleName": "",         // Middle part of name (e.g., "Jon Dev Bravo" → "Dev"). Leave empty if no middle name
    "lastName": "",           // Last part of name (e.g., "Jon Dev Bravo" → "Bravo"). If only one name, put in firstName
    "gender": "",             
    "email": "",              
    "phoneNumber": "",        
    "linkedinProfile": "",    // Extract full LinkedIn profile URL
    "country": "",            
    "state": "",              
    "city": ""                
  },
  "work": {
     "currentStatus": "",       // 4-step logic: 1) Has current job (toDate="Present" OR 2025) AND NOT internship → "Employed" 2) Latest education ends 2025+ AND no current job → "Graduating" 3) Education complete + no current job → "Unemployed" 4)Has notice period → "Notice Period"
    "experienceInYears": "",   // Sum job durations EXCLUDING internships. Convert to decimal years (6 months = 0.5). Need both fromDate and toDate. Examples: "1.5", "0.8", "2.25"                       
    "source": "",              // Source if mentioned (LinkedIn, Naukri, Referral, etc.)
    "expectedCost": "",        
    "skills": [],              
    "currentLocation": "",     
    "currentEmployer": "",    
    "department": "",          
    "designation": "",         
    "preferredLocations": []   
  },
  "experienceDetails": [
    {
      "organization": "",       
      "designation": "",       
      "country": "",           
      "state": "",              
      "employeeType": "",       // Standardize: Full-time/Permanent → "Full-time", Part-time → "Part-time", Contract/Consultant → "Contract", Intern/Trainee → "Internship", Freelance → "Freelance". Default: "Full-time"
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
}

GUIDELINES:

Always return valid JSON.

Fill missing data with empty values.

Sort education by most recent.

Derive inferred values where possible (e.g., experience).
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
