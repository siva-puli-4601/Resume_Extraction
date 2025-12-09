import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

export async function parseResumePDF(filePath) {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();      // e.g., 2025
    const currentMonth = currentDate.getMonth() + 1;
    const pdfBuffer = fs.readFileSync(filePath);
    const prompt = `
You are an expert resume parser.

Extract and return a structured JSON object from the provided resume text. Always include all fields listed below. If a field is missing, use an empty string or empty array.
Rules:
- Sort by most recent first
- toDate="Present" means currently active
- Any past date (lesser then current year) means ended
- Exclude internships from experience calculation AND from experienceDetails array
- Do NOT include any work experience entry unless it has a clearly named organization or company explicitly mentioned in the resume.
- STRICT: Do not infer or generate placeholders like "Open Source Contributor" or similar if no actual organization name is mentioned. These should be ignored in experienceDetails.
- Only include organization names exactly as written by the candidate in the resume. Do not reword or rename them.
- Return valid JSON only
JSON FORMAT:
{
  "personalInfo": {
    "fullName": "",          
    "gender": "",             
    "email": "",               // First email only
    "phoneNumber": "",        //  First phone number found, any length/format
    "linkedinProfile": "",    // Extract full LinkedIn profile URL
    "country": "",             // Only if in personal details (not inferred from experience or education)
    "state": "",             
    "city": ""                
  },
     "experienceDetails": [             
    {
      "organization": "",       // Use the organization and designation name exactly as mentioned by the candidate; do not infer or modify it.
      "designation": "",      
      "country": "",            // Only if mentioned for that company     
      "state": "",               
      "fromDate": "",           // Start date (format: YYYY-MM)
      "toDate": "",             // End date or "Present"
      "skillsUsed": []          // Include only tech stack-related skills (e.g., languages, frameworks, tools). Exclude general techniques or terms like "lazy loading".
    }
  ],
  "educationDetails": [
    {
      "degree": "",             
      "specialization": "",    
      "institution": "",        
      "year": "",         // If range like "2016-2017" → use end year "2017" | If "2024-Present" → use "Present" | Single year → use as-is     
      "gradeOrScore": ""       
    }
  ]
  "work": {
    "currentStatus": "",         
    "experienceInYears": "",    
// Calculate total work experience (exclude internships).
// Count full-time jobs even if done during education.
// Merge overlapping job periods before summing.
// Do not round up months. If today is mid-month, do not count it as a full month.
// Examples:
// - ABC: 2015-2017, XYZ: 2016-2018 → Total = 3Y-0M
// - ABC: 2015-2017, XYZ: 2015-2017 → Total = 2Y-0M
// // Format: "Xy-Ym" (e.g., "2Y-11M", "0Y-6M"). No leading zeros.  Do not round months. 11 months = "0Y-11M", NOT "1Y-0M".

// Accept dates like MM/YYYY, Month YYYY, etc.
// If toDate = "Present", use current date (${currentYear}-${currentMonth}).
// Skip entries missing dates or marked as intern/trainee/apprentice.
// If no valid job found, return "0Y-0M".
    "skills": [],             // Only tech stack skills
    "currentLocation": "",     // From current employer's location
    "currentEmployer": "",       // Only if currently employed      
    "designation": "",          // From current job, if employed
  },
  noticePeriod: "", // If mentioned in text, else empty
}
`;


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
    const text = response.text();
    console.log("Response received from Gemini AI", text);

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

      let latestExperience = null;
      let latestEducation = null;

      // Extract parsed values
      const { experienceDetails = [], educationDetails = [], work, noticePeriod } = parsedData || {};

      // Step 1: Check for notice period keywords in resume text
      // const noticeKeywords = ["notice period", "serving notice"];
      const isInNoticePeriod = noticePeriod ? true : false;

      // Step 2: Get latest experience (exclude internships, if still present somehow)
      // const validExperiences = experienceDetails.filter(exp => {
      //   return !/intern/i.test(exp.designation || "");
      // });

      // if (validExperiences.length > 0) {
      //   latestExperience = validExperiences.sort((a, b) => {
      //     const toA = a.toDate === "Present" ? "9999-12" : a.toDate || "";
      //     const toB = b.toDate === "Present" ? "9999-12" : b.toDate || "";
      //     return toB.localeCompare(toA); // Most recent first
      //   })[0];
      // }

      latestExperience = experienceDetails.length > 0 ? experienceDetails[0] : null;
      latestEducation = educationDetails.length > 0 ? educationDetails[0] : null;
      // Step 3: Get latest education
      // if (educationDetails.length > 0) {
      //   latestEducation = educationDetails.sort((a, b) => {
      //     const yearA = a.year === "Present" ? 9999 : parseInt(a.year) || 0;
      //     const yearB = b.year === "Present" ? 9999 : parseInt(b.year) || 0;
      //     return yearB - yearA; // Most recent first
      //   })[0];
      // }

      // Step 4: Determine currentStatus
      let currentStatus = "Unemployed"; // Default

      if (isInNoticePeriod) {
        currentStatus = "Notice Period";
      } else if (latestExperience && latestExperience.toDate === "Present") {
        experienceDetails[0].toDate=`${currentYear}-${currentMonth}`;
        currentStatus = "Employed";
      } else if (
        latestEducation &&
        (latestEducation.year === "Present" || parseInt(latestEducation.year) > currentYear)
      ) {
        if( latestEducation.year === "Present") {
          educationDetails[0].year=`${currentYear}`;
        }
        currentStatus = "Graduating";
      }

      // Update work object
      parsedData.work.currentStatus = currentStatus;

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
