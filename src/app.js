import express from 'express';
import resumeRoutes from './routes/resumeRoutes.js';
import { ensureUploadsDir } from './utils/ensureUploadsDir.js';
import cors from 'cors';
import bodyParser from 'body-parser';


const app = express();

// CORS configuration - Allow PUT method
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:3000'], // Add your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));

// Handle preflight requests
// app.options('*', cors());

// Ensure uploads directory exists
ensureUploadsDir();

// // Middleware - ORDER MATTERS!
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', resumeRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

export default app;
