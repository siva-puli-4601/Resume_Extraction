import express from 'express';
import { parseResumeHandler } from '../controllers/resumeController.js';
import { upload } from '../middlewares/upload.js';

const router = express.Router();

router.post('/parse-resume', upload.single('resume'), parseResumeHandler);

export default router;
