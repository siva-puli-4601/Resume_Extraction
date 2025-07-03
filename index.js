import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import "dotenv/config";
import pdfParse from 'pdf-parse';
// import { GoogleGenAI } from '@google/genai';


const app = express();
const port = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// var ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY );
// var model1 = ai.getGenerativeModel({ model: "gemini-2.5-pro" });

// LangChain-inspired processing chain for resume parsing
class ResumeProcessingChain {
    constructor(geminiApiKey) {
        this.genAI = new GoogleGenerativeAI(geminiApiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Initialize processing steps
        this.steps = [
            // { name: 'extract', processor: this.extractDataFromResume.bind(this) },
            //   { name: 'parse', processor: this.parseFieldsFromExtractedData.bind(this) },
            { name: 'validate', processor: this.validateAndStructureData.bind(this) }
        ];
    }

    // Step 1: Extract raw data from resume using Gemini
//     async extractDataFromResume(resumeText) {
//         const extractionPrompt = `
// You are an expert resume parser.

// Your task is to read the resume text below and extract all relevant information into the following **structured JSON format**.

// ### 📌 MANDATORY STRUCTURE (always include all fields, use empty strings or empty arrays if data is missing):

// {
//   "personalInfo": {
//     "firstName": "",
//     "middleName": "",
//     "lastName": "",
//     "gender": "",
//     "email": "",
//     "phoneNumber": "",
//     "linkedinProfile": "",
//     "country": "",
//     "state": "",
//     "city": ""
//   },
//   "work": {
//     "currentStatus": "",           // (e.g. Employed, Unemployed, Student) → infer from resume
//     "experienceInYears": "",       // total years of experience (calculate from experience data)
//     "source": "",                  // (e.g. where job profile was found; extract if mentioned)
//     "expectedCost": "",            // (e.g. expected salary or hourly rate)
//     "skills": [],                  // (list of skills)
//     "currentLocation": "",         // (city/state based on resume)
//     "currentEmployer": "",         // (most recent or current company)
//     "department": "",              // (if mentioned)
//     "designation": "",             // (current or most recent title)
//     "preferredLocations": []       // (locations where they prefer to work)
//   },
//   "experienceDetails": [
//     {
//       "organization": "",
//       "designation": "",
//       "country": "",
//       "state": "",
//       "employeeType": "",           // (e.g. Full-time, Internship, Contract)
//       "fromDate": "",
//       "toDate": "",
//       "skillsUsed": []
//     }
//   ],
//   "educationDetails": [
//     {
//       "degree": "",
//       "specialization": "",
//       "institution": "",
//       "year": "",
//       "gradeOrScore": ""
//     }
//   ]
// }

// 📌 ADDITIONAL INSTRUCTIONS:
// - If a field is **missing in the resume**, include it with an empty string or empty array — do NOT remove any field.
// - For educationDetails, sort the list in **reverse chronological order** (e.g., BTech → 12th → 10th).
// - Infer **currentStatus** and **experienceInYears** based on timeline or job history if not explicitly stated.
// - Use consistent formatting for phone, date, etc.
// - Return only the raw **valid JSON**, no extra text or markdown code block.

// ---

// Resume Text:
// ${resumeText}
// `;


//         try {
//             const result = await this.model.generateContent(extractionPrompt);
//             const response = await result.response;
//             return {
//                 success: true,
//                 extractedData: response.text(),
//                 step: 'extraction',
//                 timestamp: new Date().toISOString()
//             };
//         } catch (error) {
//             throw new Error(`Data extraction failed: ${error.message}`);
//         }
//     }

    //   // Step 2: Parse specific fields from extracted data using Gemini
    //   async parseFieldsFromExtractedData(extractedData) {
    //     const parsingPrompt = `
    // You are a structured data parser. From the extracted resume data below, parse and return ONLY a valid JSON object with the following specific fields:

    // REQUIRED FIELDS:
    // {
    //   "firstName": "string or null",
    //   "lastName": "string or null", 
    //   "email": "string or null",
    //   "phone": "string or null",
    //   "skills": ["array of skills"]
    // }

    // COMPREHENSIVE ADDITIONAL FIELDS:
    // {
    //   "fullName": "complete name as written",
    //   "title": "current job title or desired position",
    //   "summary": "professional summary or objective",
    //   "location": "address or location",
    //   "linkedin": "LinkedIn profile URL",
    //   "github": "GitHub profile URL", 
    //   "website": "personal website or portfolio URL",
    //   "yearsOfExperience": "total years (number or null)",
    //   "currentCompany": "current or most recent company",

    //   "experience": [
    //     {
    //       "company": "company name",
    //       "position": "job title", 
    //       "duration": "time period",
    //       "location": "job location",
    //       "responsibilities": ["array of responsibilities"],
    //       "achievements": ["array of achievements"]
    //     }
    //   ],

    //   "education": [
    //     {
    //       "institution": "school/university name",
    //       "degree": "degree type",
    //       "field": "field of study",
    //       "graduationYear": "year or null",
    //       "gpa": "GPA if mentioned"
    //     }
    //   ],

    //   "certifications": ["array of certifications"],
    //   "projects": [
    //     {
    //       "name": "project name",
    //       "description": "project description", 
    //       "technologies": ["technologies used"],
    //       "duration": "time period"
    //     }
    //   ],
    //   "achievements": ["array of achievements/awards"],
    //   "languages": ["array of spoken languages"],

    //   "technicalSkills": {
    //     "programmingLanguages": ["array"],
    //     "frameworks": ["array"], 
    //     "databases": ["array"],
    //     "tools": ["array"],
    //     "cloudPlatforms": ["array"],
    //     "other": ["array"]
    //   },

    //   "softSkills": ["array of soft skills"],
    //   "industryExperience": ["array of industries"]
    // }

    // IMPORTANT: 
    // - Return ONLY valid JSON, no explanations or additional text
    // - Use null for missing information
    // - Ensure all arrays are properly formatted
    // - Be thorough and extract as much detail as possible

    // Extracted Resume Data:
    // ${extractedData}
    // `;

    //     try {
    //       const result = await this.model.generateContent(parsingPrompt);
    //       const response = await result.response;
    //       let parsedContent = response.text().trim();

    //       // Clean up response to ensure valid JSON
    //       if (parsedContent.startsWith('```json')) {
    //         parsedContent = parsedContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
    //       } else if (parsedContent.startsWith('```')) {
    //         parsedContent = parsedContent.replace(/```\n?/, '').replace(/\n?```$/, '');
    //       }

    //       const parsedFields = JSON.parse(parsedContent);

    //       return {
    //         success: true,
    //         parsedFields: parsedFields,
    //         step: 'parsing',
    //         timestamp: new Date().toISOString()
    //       };
    //     } catch (error) {
    //       throw new Error(`Field parsing failed: ${error.message}`);
    //     }
    //   }

    // Step 3: Validate and structure the final data
    async validateAndStructureData(resumeText) {
        const validationPrompt = `
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

        try {
            const result = await this.model.generateContent(validationPrompt);
            const response = await result.response;
            let validatedContent = response.text().trim();

            // Clean up response
            if (validatedContent.startsWith('```json')) {
                validatedContent = validatedContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
            } else if (validatedContent.startsWith('```')) {
                validatedContent = validatedContent.replace(/```\n?/, '').replace(/\n?```$/, '');
            }

            const validatedData = JSON.parse(validatedContent);

            return {
                success: true,
                finalData: validatedData,
                step: 'validation',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Data validation failed: ${error.message}`);
        }
    }

    // Execute the complete processing chain
    async executeChain(resumeText) {
        const processingResults = {
           
            finalResult: null,
            success: false,
           
        };

        try {
            console.log('Starting resume processing chain...');

            // Step 1: Extract data from resume
            // console.log('📄 Step 1: Extracting data from resume...');
            // const extractionResult = await this.extractDataFromResume(resumeText);
            // console.log('Extraction Result:', extractionResult);
            // processingResults.pipeline.push({
            //     step: 'extraction',
            //     success: extractionResult.success,
            //     timestamp: extractionResult.timestamp
            // });

            //   // Step 2: Parse fields from extracted data
            //   console.log('🔍 Step 2: Parsing fields from extracted data...');
            //   const parsingResult = await this.parseFieldsFromExtractedData(extractionResult.extractedData);
            //   processingResults.pipeline.push({
            //     step: 'parsing',
            //     success: parsingResult.success,
            //     timestamp: parsingResult.timestamp
            //   });

            // Step 3: Validate and structure final data
            console.log('✅ Step 3: Validating and structuring data...');
            const validationResult = await this.validateAndStructureData(resumeText);
            console.log('Validation Result:', validationResult);

            processingResults.finalResult = validationResult.finalData;
            processingResults.success = true;

            console.log('✨ Resume processing chain completed successfully!');
            return processingResults;

        } catch (error) {
            processingResults.success = false;
            processingResults.error = error.message;
            console.error('❌ Resume processing chain failed:', error.message);
            throw error;
        }
    }
}

// Initialize the processing chain
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '*******************';
const resumeChain = new ResumeProcessingChain(GEMINI_API_KEY);

// Utility function to read different file types
async function readResumeFile(filePath, fileExtension) {
    switch (fileExtension) {
        case '.txt':
            return fs.readFileSync(filePath, 'utf8');
        case '.pdf': {
            const fileBuffer = fs.readFileSync(filePath); // No 'utf8' encoding
            const data = await pdfParse(fileBuffer);
            return data.text; // Extracted plain text from PDF
        }
        default:
            throw new Error(`Unsupported file format: ${fileExtension}. Currently supported: .txt`);
    }
}

// Routes

// Main resume parsing endpoint
app.post('/parse-resume', upload.single('resume'), async (req, res) => {
    const startTime = Date.now();

    try {
        let resumeText = '';

        // Handle file upload or direct text input
        if (req.file) {
            console.log(`📁 Processing uploaded file: ${req.file.originalname}`);
            const filePath = req.file.path;
            const fileExtension = path.extname(req.file.originalname).toLowerCase();

            try {
                resumeText = await readResumeFile(filePath, fileExtension);
                fs.unlinkSync(filePath); // Clean up uploaded file
            } catch (fileError) {
                fs.unlinkSync(filePath); // Clean up on error
                return res.status(400).json({
                    success: false,
                    error: fileError.message,
                    supportedFormats: ['.pdf']
                });
            }
        } else if (req.body.resumeText) {
            console.log('📝 Processing resume text from request body');
            resumeText = req.body.resumeText;
        } else {
            return res.status(400).json({
                success: false,
                error: 'No resume file or text provided',
                usage: 'Send file via form-data with key "resume" or send text via JSON with key "resumeText"'
            });
        }

        // Execute the processing chain
        console.log(resumeText);
        const processingResults = await resumeChain.executeChain(resumeText);

        res.json({
            success: true,
            data: processingResults.finalResult,
        });

    } catch (error) {
        console.error('Resume parsing error:', error);

        res.status(500).json({
            success: false,
            error: 'Resume parsing failed',
            details: error.message,
        });
    }
});




app.listen(port, () => {
    console.log(`📡 Server running at http://localhost:${port}`);
});
