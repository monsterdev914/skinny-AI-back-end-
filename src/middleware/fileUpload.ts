import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Initialize upload directories
const uploadsDir = path.join(process.cwd(), 'uploads');
const analysisDir = path.join(uploadsDir, 'analysis');
const avatarsDir = path.join(uploadsDir, 'avatars');
const tempDir = path.join(uploadsDir, 'temp'); // For temporary validation files

ensureDirectoryExists(uploadsDir);
ensureDirectoryExists(analysisDir);
ensureDirectoryExists(avatarsDir);
ensureDirectoryExists(tempDir);

// Storage configuration for analysis images
const analysisStorage = multer.diskStorage({
    destination: (req: Request, _file, cb) => {
        const userId = (req as any).user?.id;
        if (!userId) {
            return cb(new Error('User not authenticated'), '');
        }
        
        const userAnalysisDir = path.join(analysisDir, userId);
        ensureDirectoryExists(userAnalysisDir);
        cb(null, userAnalysisDir);
    },
    filename: (_req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `analysis-${uniqueSuffix}${ext}`);
    }
});

// Storage configuration for avatar images
const avatarStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        console.log('Multer destination - avatarsDir:', avatarsDir);
        console.log('Directory exists:', fs.existsSync(avatarsDir));
        cb(null, avatarsDir);
    },
    filename: (req, file, cb) => {
        const userId = (req as any).user?.id;
        console.log('Multer filename - userId:', userId);
        console.log('Original filename:', file.originalname);
        
        if (!userId) {
            console.log('ERROR: User not authenticated in multer');
            return cb(new Error('User not authenticated'), '');
        }
        
        // Use userId as filename to replace previous avatars
        const ext = path.extname(file.originalname);
        const filename = `avatar-${userId}${ext}`;
        console.log('Generated filename:', filename);
        cb(null, filename);
    }
});

// Storage configuration for temporary files (validation, etc.)
const tempStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, tempDir);
    },
    filename: (_req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `temp-${uniqueSuffix}${ext}`);
    }
});

// File filter for images only
const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'));
    }
};

// Analysis image upload middleware
export const uploadAnalysisImage = multer({
    storage: analysisStorage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit (since frontend compresses to 150KB)
    },
    fileFilter: imageFileFilter
});

// Avatar image upload middleware
export const uploadAvatarImage = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit (since frontend compresses to 150KB)
    },
    fileFilter: imageFileFilter
});

// Temporary image upload middleware (for validation, no auth required)
export const uploadTempImage = multer({
    storage: tempStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: imageFileFilter
});

// Helper function to get file URL
export const getFileUrl = (req: Request, filePath: string): string => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // Convert Windows backslashes to forward slashes for URLs
    const normalizedPath = filePath.replace(/\\/g, '/');
    // Always add /uploads/ prefix since getRelativePath now returns path without it
    return `${baseUrl}/uploads/${normalizedPath}`;
};

// Helper function to get relative path from absolute path
export const getRelativePath = (absolutePath: string): string => {
    console.log('getRelativePath input:', absolutePath);
    
    const uploadsIndex = absolutePath.indexOf('uploads');
    console.log('uploads index found at:', uploadsIndex);
    
    if (uploadsIndex === -1) {
        console.log('No uploads found in path, returning original:', absolutePath);
        return absolutePath;
    }
    
    // Return path starting after 'uploads/' or 'uploads\' to avoid double prefix
    const uploadsPath = absolutePath.substring(uploadsIndex);
    console.log('uploads path substring:', uploadsPath);
    
    // Handle both forward slashes (Linux/Mac) and backslashes (Windows)
    if (uploadsPath.startsWith('uploads/')) {
        const result = uploadsPath.substring(8); // Remove 'uploads/' prefix
        console.log('Removed uploads/ prefix, result:', result);
        return result;
    } else if (uploadsPath.startsWith('uploads\\')) {
        const result = uploadsPath.substring(8); // Remove 'uploads\' prefix (8 chars, not 9!)
        console.log('Removed uploads\\ prefix, result:', result);
        return result;
    }
    
    console.log('No uploads/ or uploads\\ prefix found, returning:', uploadsPath);
    return uploadsPath;
};

// Helper function to delete file
export const deleteFile = (filePath: string) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
}; 