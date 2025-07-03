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
    "firstName": "",          // First name from contact or personal section like jon dev bravo then jon is fname.
    "middleName": "",         // If not explicitly available, leave blank dev is midname .
    "lastName": "",           // Last name from full name in resume header bravo is last name.
    "gender": "",             // If not mentioned, infer only if clearly stated (e.g. he/she/him/her); else leave blank.
    "email": "",              // Look for valid email patterns.
    "phoneNumber": "",        // Look for 10+ digit numbers or international format.
    "linkedinProfile": "",    // Extract full LinkedIn profile URL.
    "country": "",            // Country from address/contact details.
    "state": "",              // State from address or location.
    "city": ""                // City from address or location.
  },
  "work": {
    "currentStatus": "",       // Use keywords like "currently working", "looking for", "student" to infer (Employed, Unemployed, Student).
    "experienceInYears": "",   // Calculate from experience dates. Can be in decimals like 0.8(e.g. 1.6).
    "source": "",              // If resume mentions source like LinkedIn, Naukri, Referral, etc.
    "expectedCost": "",        // Extract salary expectations or hourly rate if mentioned.
    "skills": [],              // List of all technical and soft skills explicitly listed or inferred.
    "currentLocation": "",     // Latest work location or address.
    "currentEmployer": "",     // Most recent company name where candidate is/was working.
    "department": "",          // Department like Engineering, HR, Sales (if mentioned).
    "designation": "",         // Current or most recent job title.
    "preferredLocations": []   // Locations where candidate wishes to work (from objective/preferences).
  },
  "experienceDetails": [
    {
      "organization": "",        // Company/Organization name.
      "designation": "",         // Role/Title in that organization.
      "country": "",             // Work location country.
      "state": "",               // Work location state.
      "employeeType": "",        // Full-time, Internship, Freelance, Contract (if stated).
      "fromDate": "",            // Start date (format not strict, but readable).
      "toDate": "",              // End date or "Present".
      "skillsUsed": []           // Skills *used in this role only*. Be specific (e.g., JavaScript, Python, React). Avoid generic phrases.
    }
  ],
  "educationDetails": [
    {
      "degree": "",              // Bachelor's, Master's, Diploma, etc.
      "specialization": "",      // Major subject or stream.
      "institution": "",         // College/University/School name.
      "year": "",                // Year of graduation or completion.
      "gradeOrScore": ""         // CGPA, percentage, etc.
    }
  ]
}

GUIDELINES:

Always return valid JSON

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
