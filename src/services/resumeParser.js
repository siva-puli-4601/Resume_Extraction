import fs from 'fs';
import pdf from 'pdf-parse';

// Enhanced regex patterns
const REGEX_PATTERNS = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/,
    linkedin: /(linkedin\.com\/in\/[\w-]+)/i,
    // Improved date patterns with better matching
    dates: [
        /(\d{1,2}\/\d{4}\s*[-–—]\s*\d{1,2}\/\d{4})/g,  // 12/2023 – 11/2024
        /(\d{1,2}\/\d{4})\s*[-–—]\s*(present|current)/gi, // 12/2023 - Present
        /(\w+\s+\d{4})\s*[-–—]\s*(\w+\s+\d{4})/g,      // January 2017 - March 2018
        /(\d{4})\s*[-–—]\s*(\d{4})/g,                   // 2020-2024
        /(\d{1,2}\/\d{4})/g                             // Single dates
    ]
};

const SKILLS_DATABASE = [
    // Programming Languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
    'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'SQL', 'NoSQL', 'HTML', 'CSS', 'SASS', 'LESS',
    
    // Frameworks & Libraries
    'React', 'React.js', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'Spring', 'Spring Boot',
    'Django', 'Flask', 'Laravel', 'Rails', 'ASP.NET', 'jQuery', 'Bootstrap', 'Hibernate',
    'Redux', 'Next.js', 'Nuxt.js', 'Electron', 'J2EE',
    
    // Databases
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQLite', 'Cassandra', 'DynamoDB',
    'Elasticsearch', 'Neo4j',
    
    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Terraform',
    'Ansible', 'Git', 'GitHub', 'GitLab', 'Bitbucket',
    
    // AI & ML Technologies
    'Machine Learning', 'Deep Learning', 'GenAI', 'OpenAI', 'ChatGPT', 'Gemini', 'Claude',
    'Hugging Face', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NumPy', 'Jupyter',
    'RAG', 'NLP', 'Computer Vision', 'Mistral', 'DeepSeek', 'GenSpark', 'Lovable', 'Bolt',
    
    // Other Technologies
    'Microservices', 'REST API', 'GraphQL', 'WebSocket', 'OAuth', 'JWT', 'SOAP',
    'RPA', 'Blockchain', 'IoT', 'AR/VR'
];

const SECTION_PATTERNS = {
    experience: /(?:professional\s+experience|work\s+experience|experience|employment\s+history|career\s+history)/i,
    education: /(?:education|academic\s+qualifications|educational\s+background|academic\s+background)/i,
    skills: /(?:technical\s+skills|skills|technologies|core\s+competencies|expertise)/i,
    projects: /(?:projects|key\s+projects|notable\s+projects)/i
};

// Main parsing function
async function parseResume(filePath) {
    try {
        const text = await extractTextFromPDF(filePath);
        const parsedData = processResumeText(text);
        
        return {
            success: true,
            data: parsedData
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Extract text from PDF
async function extractTextFromPDF(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
    }
    
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
}

// Process the extracted resume text
function processResumeText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const sections = identifySections(text, lines);
    
    return {
        personalInfo: extractPersonalInfo(text, lines),
        work: extractWorkInfo(text, lines, sections),
        experienceDetails: extractExperienceDetails(text, lines, sections),
        educationDetails: extractEducationDetails(text, lines, sections)
    };
}

// Identify different sections in the resume
function identifySections(text, lines) {
    const sections = {};
    
    for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
        let sectionIndex = -1;
        
        // Find section header
        for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i])) {
                sectionIndex = i;
                break;
            }
        }
        
        if (sectionIndex !== -1) {
            // Find next section to determine end boundary
            let nextSectionIndex = lines.length;
            for (let i = sectionIndex + 1; i < lines.length; i++) {
                for (const nextPattern of Object.values(SECTION_PATTERNS)) {
                    if (nextPattern.test(lines[i]) && nextPattern !== pattern) {
                        nextSectionIndex = i;
                        break;
                    }
                }
                if (nextSectionIndex !== lines.length) break;
            }
            
            sections[sectionName] = {
                start: sectionIndex,
                content: lines.slice(sectionIndex + 1, nextSectionIndex)
            };
        }
    }
    
    return sections;
}

// Extract personal information
function extractPersonalInfo(text, lines) {
    const email = extractEmail(text);
    const phone = extractPhoneNumber(text);
    const linkedin = extractLinkedIn(text);
    const fullName = extractName(lines, email);
    const location = extractLocation(text, lines);

    return {
        fullName: fullName,
        gender: "",
        email: email,
        phoneNumber: phone,
        linkedinProfile: linkedin,
        country: location.country,
        state: location.state,
        city: location.city
    };
}

// Extract email from text
function extractEmail(text) {
    const match = text.match(REGEX_PATTERNS.email);
    return match ? match[0] : "";
}

// Extract phone number
function extractPhoneNumber(text) {
    const phonePatterns = [
        /\b\d{10}\b/,                               // 10-digit number (Indian format)
        /(\+91[-.\s]?)?\d{10}/,                     // Indian format with country code
        /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/ // US format
    ];
    
    for (const pattern of phonePatterns) {
        const match = text.match(pattern);
        if (match) return match[0].replace(/\D/g, ''); // Remove non-digits
    }
    return "";
}

// Extract LinkedIn profile
function extractLinkedIn(text) {
    const match = text.match(/linkedin\.com\/in\/[\w-]+/i);
    return match ? match[0] : "";
}

// Improved name extraction
function extractName(lines, email) {
    // Look for name in first few lines, excluding contact info
    for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i];
        
        // Skip lines with contact info or headers
        if (REGEX_PATTERNS.email.test(line) || 
            /\d{10}|phone|mobile|ph:/i.test(line) ||
            /linkedin|github/i.test(line) ||
            /resume|cv|curriculum/i.test(line)) {
            continue;
        }
        
        // Check if line looks like a name (2-3 words, proper case)
        if (line.length > 5 && line.length < 50 && 
            /^[A-Z][a-zA-Z\s]+$/.test(line) && 
            line.split(' ').length >= 2 && line.split(' ').length <= 4) {
            return line;
        }
    }
    
    return email ? email.split('@')[0] : "";
}

// Improved location extraction
function extractLocation(text, lines) {
    // Look for location patterns near contact information
    const contactSection = lines.slice(0, 10).join(' ');
    
    const locationPatterns = [
        /([A-Z][a-z]+),\s*([A-Z][a-z]+),\s*([A-Z][a-z]+)/,  // City, State, Country
        /([A-Z][a-z]+),\s*([A-Z]{2})\s*,?\s*([A-Z][a-z]+)?/, // City, State Code, Country
        /([A-Z][a-z]+)\s*,\s*([A-Z][a-z]+)$/m               // City, State
    ];
    
    for (const pattern of locationPatterns) {
        const match = contactSection.match(pattern);
        if (match && !isSkillOrTechnology(match[1]) && !isSkillOrTechnology(match[2])) {
            return {
                city: match[1] || "",
                state: match[2] || "",
                country: match[3] || ""
            };
        }
    }
    
    return { city: "", state: "", country: "" };
}

// Helper function to check if a word is a skill/technology
function isSkillOrTechnology(word) {
    return SKILLS_DATABASE.some(skill => 
        skill.toLowerCase() === word.toLowerCase()
    );
}

// Extract work-related information
function extractWorkInfo(text, lines, sections) {
    const skills = extractSkills(text, sections);
    const experience = calculateExperience(text);
    const currentEmployer = extractCurrentEmployer(text, sections);
    const designation = extractCurrentDesignation(text, sections);

    return {
        currentStatus: "",
        experienceInYears: experience,
        source: "",
        expectedCost: "",
        skills: skills,
        currentLocation: "",
        currentEmployer: currentEmployer,
        department: null,
        designation: designation,
        preferredLocations: []
    };
}

// Improved skills extraction
function extractSkills(text, sections) {
    const foundSkills = [];
    
    // Priority extraction from skills section
    const skillsSection = sections.skills?.content || [];
    const skillsText = skillsSection.join(' ');
    
    // Extract from dedicated skills section first
    if (skillsText) {
        for (const skill of SKILLS_DATABASE) {
            const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (skillRegex.test(skillsText)) {
                foundSkills.push(skill);
            }
        }
    }
    
    // If no skills section, extract from full text
    if (foundSkills.length === 0) {
        for (const skill of SKILLS_DATABASE) {
            const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (skillRegex.test(text)) {
                foundSkills.push(skill);
            }
        }
    }
    
    return [...new Set(foundSkills)];
}

// Calculate years of experience
function calculateExperience(text) {
    const currentYear = new Date().getFullYear();
    
    // Look for experience ranges first
    const experienceRanges = text.match(/(\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4})/g);
    if (experienceRanges) {
        let totalMonths = 0;
        experienceRanges.forEach(range => {
            const [start, end] = range.split(/[-–—]/).map(d => d.trim());
            const startDate = new Date(start.split('/')[1], start.split('/')[0] - 1);
            const endDate = new Date(end.split('/')[1], end.split('/')[0] - 1);
            totalMonths += (endDate - startDate) / (1000 * 60 * 60 * 24 * 30);
        });
        return Math.max(0, Math.round(totalMonths / 12));
    }
    
    // Fallback to year range calculation
    const yearMatches = text.match(/\b(20\d{2})\b/g);
    if (yearMatches && yearMatches.length >= 2) {
        const years = [...new Set(yearMatches.map(y => parseInt(y)))].sort();
        return Math.max(0, currentYear - years[0]);
    }
    
    return 0;
}

// Improved current employer extraction
function extractCurrentEmployer(text, sections) {
    const experienceSection = sections.experience?.content || [];
    
    // Look for company patterns in experience section
    const companyPatterns = [
        /([A-Z][a-zA-Z\s]+(?:Technologies|Systems|Software|Solutions|Services|Inc|LLC|Corp|Ltd|Company|Pvt\.?\s*Ltd\.?))/i,
        /([A-Z][a-zA-Z\s&]+(?:Technologies|Systems|Software|Solutions))/i
    ];
    
    // Check first few lines of experience section
    for (const line of experienceSection.slice(0, 3)) {
        for (const pattern of companyPatterns) {
            const match = line.match(pattern);
            if (match) {
                const company = match[1].trim();
                // Validate it's not a skill or generic term
                if (!isSkillOrTechnology(company.split(' ')[0])) {
                    return company;
                }
            }
        }
    }
    
    return "";
}

// Extract current designation
function extractCurrentDesignation(text, sections) {
    const experienceSection = sections.experience?.content || [];
    
    const titlePatterns = [
        /^(Senior|Junior|Lead|Associate)?\s*(Software Engineer|Developer|Analyst|Manager|Designer|Consultant|Architect)/i,
        /(Software Engineer|Web Developer|Full Stack Developer|Backend Developer|Frontend Developer)/i
    ];
    
    // Check experience section
    for (const line of experienceSection.slice(0, 3)) {
        for (const pattern of titlePatterns) {
            const match = line.match(pattern);
            if (match) return match[0].trim();
        }
    }
    
    return "";
}

// Improved experience details extraction
function extractExperienceDetails(text, lines, sections) {
    const experiences = [];
    const experienceSection = sections.experience?.content || [];
    
    if (experienceSection.length === 0) return experiences;
    
    let currentExp = null;
    
    for (let i = 0; i < experienceSection.length; i++) {
        const line = experienceSection[i];
        
        // Skip empty lines
        if (!line.trim()) continue;
        
        // Check if this line contains a job title
        const titleMatch = line.match(/(Software Engineer|Developer|Analyst|Manager|Designer|Consultant|Associate)/i);
        
        // Check if this line contains a company name
        const companyMatch = line.match(/([A-Z][a-zA-Z\s]+(?:Technologies|Systems|Software|Solutions|Services|Inc|LLC|Corp|Ltd|Company|Pvt))/i);
        
        // Check if this line contains dates
        const dateMatch = line.match(/(\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4})/);
        
        // If we find a company or title, start a new experience entry
        if (companyMatch || titleMatch) {
            // Save previous experience if it exists
            if (currentExp && currentExp.organization) {
                experiences.push(currentExp);
            }
            
            currentExp = {
                organization: companyMatch ? companyMatch[1].trim() : "",
                designation: titleMatch ? titleMatch[1] : "",
                country: null,
                state: null,
                employeeType: "",
                fromDate: "",
                toDate: "",
                skillsUsed: []
            };
        }
        
        // Add dates to current experience
        if (currentExp && dateMatch) {
            currentExp.fromDate = dateMatch[1];
            currentExp.toDate = dateMatch[2];
        }
        
        // Extract skills from this line
        if (currentExp) {
            const lineSkills = extractSkillsFromSection(line);
            currentExp.skillsUsed = [...new Set([...currentExp.skillsUsed, ...lineSkills])];
        }
    }
    
    // Add the last experience
    if (currentExp && currentExp.organization) {
        experiences.push(currentExp);
    }
    
    return experiences;
}

// Extract skills from specific section
function extractSkillsFromSection(section) {
    const foundSkills = [];
    for (const skill of SKILLS_DATABASE) {
        const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (skillRegex.test(section)) {
            foundSkills.push(skill);
        }
    }
    return foundSkills.slice(0, 5); // Limit to 5 skills per section
}

// Improved education details extraction
function extractEducationDetails(text, lines, sections) {
    const educationSection = sections.education?.content || [];
    const education = [];
    
    if (educationSection.length === 0) return education;
    
    let currentEdu = null;
    
    for (const line of educationSection) {
        if (!line.trim()) continue;
        
        // Check for degree
        const degreeMatch = line.match(/(Bachelor|Master|PhD|B\.Tech|M\.Tech|MBA|B\.Sc|M\.Sc|Intermediate|SSC|10th)/i);
        
        // Check for institution
        const instMatch = line.match(/([A-Z][A-Z\s&.]+(?:COLLEGE|UNIVERSITY|INSTITUTE|SCHOOL))/i);
        
        // Check for year
        const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/);
        
        // Check for specialization
        const specMatch = line.match(/\b(Information Technology|Computer Science|MPC|SSC|Engineering)\b/i);
        
        // If we find degree or institution, start new education entry
        if (degreeMatch || instMatch) {
            if (currentEdu && (currentEdu.degree || currentEdu.institution)) {
                education.push(currentEdu);
            }
            
            currentEdu = {
                degree: degreeMatch ? degreeMatch[1] : "",
                specialization: specMatch ? specMatch[1] : "",
                institution: instMatch ? instMatch[1].trim() : "",
                year: yearMatch ? parseInt(yearMatch[1]) : null,
                gradeOrScore: null
            };
        } else if (currentEdu) {
            // Update current education with additional info
            if (!currentEdu.year && yearMatch) {
                currentEdu.year = parseInt(yearMatch[1]);
            }
            if (!currentEdu.specialization && specMatch) {
                currentEdu.specialization = specMatch[1];
            }
        }
    }
    
    // Add the last education entry
    if (currentEdu && (currentEdu.degree || currentEdu.institution)) {
        education.push(currentEdu);
    }
    
    return education;
}

// Usage function
 export default async function processResumeFile(filePath) {
    console.log(`Processing: ${filePath}`);
    const result = await parseResume(filePath);
    console.log(JSON.stringify(result, null, 2));
    return result;
}

// // Export functions
// module.exports = {
//     parseResume,
//     processResumeFile,
//     extractTextFromPDF,
//     processResumeText,
//     extractPersonalInfo,
//     extractWorkInfo,
//     extractExperienceDetails,
//     extractEducationDetails
// };

