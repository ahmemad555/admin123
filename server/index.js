import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config, supabase } from './config.js';

// Import routes
import authRoutes from './routes/auth.js';
import printersRoutes from './routes/printers.js';
import firmwareRoutes from './routes/firmware.js';
import historyRoutes from './routes/history.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || config.port;
const JWT_SECRET = config.jwtSecret;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-vercel-domain.vercel.app', 'https://fota-concrete-printing.vercel.app']
    : config.cors.origin,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
}

// Create uploads directory if it doesn't exist (للملفات المؤقتة)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/printers', printersRoutes);
app.use('/api/firmware', firmwareRoutes);
app.use('/api/history', historyRoutes);

// Test Supabase connection
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('firmware_updates')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      return res.status(500).json({ 
        error: 'Supabase connection failed', 
        details: error.message 
      });
    }

    res.json({
      success: true,
      message: 'Supabase connection successful',
      data: data,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Supabase test error:', error);
    res.status(500).json({ 
      error: 'Supabase test failed', 
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'Server is running with Supabase integration on Vercel',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    supabase: {
      url: config.supabase.url,
      connected: true
    },
    vercel: {
      region: process.env.VERCEL_REGION || 'local',
      deployment: process.env.VERCEL_URL || 'local'
    }
  });
});

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  console.error('Server error:', error);
  res.status(500).json({ 
    error: error.message,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start server only if not in Vercel environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 FOTA Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`🗄️  Supabase URL: ${config.supabase.url}`);
    console.log(`📁 File uploads directory: ${uploadsDir}`);
    console.log(`☁️  Files will be stored in Supabase Storage & Google Drive`);
  });
}

// Export for Vercel
export default app;