import { model } from "../config/gemini.js";

export async function parseResumeText(resumeText) {
    const prompt = `
You are an expert resume parser.

Extract and return a structured JSON object from the provided resume text. Always include all fields listed below. If a field is missing, use an empty string or empty array.

JSON FORMAT:
{
  "personalInfo": {
    "firstName": "",
    "middleName": "",
    "lastName": "",
    "gender": "",
    "email": "",
    "phoneNumber": "",
    "linkedinProfile": "",
    "country": "",
    "state": "",
    "city": ""
  },
  "work": {
    "currentStatus": "",           // (e.g. Employed, Unemployed, Student) → infer from resume
    "experienceInYears": "",       // total years of experience (calculate from experience data) it may in points also like 0.8 , 1.6 etc..
    "source": "",                  // (e.g. where job profile was found; extract if mentioned)
    "expectedCost": "",            // (e.g. expected salary or hourly rate)
    "skills": [],                  // (list of skills)
    "currentLocation": "",         // (city/state based on resume)
    "currentEmployer": "",         // (most recent or current company)
    "department": "",              // (if mentioned)
    "designation": "",             // (current or most recent title)
    "preferredLocations": []       // (locations where they prefer to work)
  },
  "experienceDetails": [
    {
      "organization": "",
      "designation": "",
      "country": "",
      "state": "",
      "employeeType": "",           // (e.g. Full-time, Internship, Contract)
      "fromDate": "",
      "toDate": "",
      "skillsUsed": []  // include on skills used in the role not include like various frameworks and tools give exact skills like java, react Js, angular
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

Resume Text:
${resumeText}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let rawText = response.text().trim();

    if (rawText.startsWith("```json")) {
        rawText = rawText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (rawText.startsWith("```")) {
        rawText = rawText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const json = JSON.parse(rawText);

    return json;
}
