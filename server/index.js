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
const PORT = config.port;
const JWT_SECRET = config.jwtSecret;

// Middleware
app.use(cors(config.cors));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
      data: data
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
    status: 'Server is running with Supabase integration',
    timestamp: new Date().toISOString(),
    supabase: {
      url: config.supabase.url,
      connected: true
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  console.error('Server error:', error);
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`🚀 FOTA Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🗄️  Supabase URL: ${config.supabase.url}`);
  console.log(`📁 File uploads directory: ${uploadsDir}`);
  console.log(`☁️  Files will be stored in Supabase Storage`);
});