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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyA84_U6XgvAo7wsyTQFtZI7kRADDUGPu_g';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const validateAndStructureData = async (resumeText) => {
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
        const result = await model.generateContent(validationPrompt);
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
        };
    } catch (error) {
        throw new Error(`Data validation failed: ${error.message}`);
    }
}

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
        const processingResults = await validateAndStructureData(resumeText);

        res.json({
            success: true,
            data: processingResults.finalData,
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