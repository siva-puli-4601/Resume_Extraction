import { parseResumeText } from "../services/resumeParser.js";
import { readResumeFile } from "../services/fileReader.js";
import fs from 'fs';
import path from 'path';

export const parseResumeHandler = async (req, res) => {

    try {
        let resumeText = '';

        if (req.file) {
            const filePath = req.file.path;
            const fileExtension = path.extname(req.file.originalname).toLowerCase();

            try {
                resumeText = await readResumeFile(filePath, fileExtension);
                fs.unlinkSync(filePath); // Delete the uploaded file
            } catch (err) {
                fs.unlinkSync(filePath);
                return res.status(400).json({
                    success: false,
                    error: err.message,
                    supportedFormats: ['.pdf']
                });
            }
        } else if (req.body.resumeText) {
            resumeText = req.body.resumeText;
        } else {
            return res.status(400).json({
                success: false,
                error: 'No resume file or text provided',
                usage: 'Send file via form-data with key "resume" or send text via JSON with key "resumeText"'
            });
        }

        const result = await parseResumeText(resumeText);

        return res.json({
            success: true,
            data: result,
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: 'Resume parsing failed',
            details: err.message
        });
    }
};
