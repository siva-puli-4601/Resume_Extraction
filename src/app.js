import express from 'express';
import resumeRoutes from './routes/resumeRoutes.js';
import { ensureUploadsDir } from './utils/ensureUploadsDir.js';

const app = express();

// Ensure uploads directory exists
ensureUploadsDir();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', resumeRoutes);

export default app;
