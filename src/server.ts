import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import router from './routes/index';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = (process.env as any)['PORT'] || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: [
        (process.env as any)['CLIENT_URL'] || 'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'https://rapid-gladly-platypus.ngrok-free.app',
        'https://api.skinly.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt((process.env as any)['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
    max: parseInt((process.env as any)['RATE_LIMIT_MAX_REQUESTS'] || '100'), // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if ((process.env as any)['NODE_ENV'] === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Static file serving for uploads with comprehensive CORS headers
app.use('/uploads', (req, res, next) => {
    // Set comprehensive CORS headers for static files
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'false');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    
    next();
}, express.static(path.join(process.cwd(), 'uploads')));




// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use('/api', router);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database connection
mongoose.connect((process.env as any)['MONGODB_URI']!)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${(process.env as any)['NODE_ENV']}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});

export default app; 