import fs from 'fs';
import pdfParse from 'pdf-parse';

export async function readResumeFile(filePath, extension) {
    switch (extension) {
        case '.txt':
            return fs.readFileSync(filePath, 'utf8');
        case '.pdf': {
            const fileBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(fileBuffer);
            return data.text;
        }
        default:
            throw new Error(`Unsupported file format: ${extension}. Currently supported: .pdf`);
    }
}
