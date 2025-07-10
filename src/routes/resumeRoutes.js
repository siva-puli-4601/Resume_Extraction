import express from 'express';
import { parseResumeHandler } from '../controllers/resumeController.js';
import { upload } from '../middlewares/upload.js';
import { handleParseResume } from '../controllers/handleParseResume.js';

const router = express.Router();

// router.post('/parse-resume', upload.single('resume'), parseResumeHandler);
router.put("/resumeExtracting", upload.single("file"), handleParseResume);

export default router;
