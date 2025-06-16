import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { config } from '../config.js';
import StorageService from '../services/storageService.js';

const router = express.Router();
const storageService = new StorageService();

// إعداد multer للذاكرة المؤقتة
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (config.allowedFileTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${config.allowedFileTypes.join(', ')} files are allowed`));
    }
  },
  limits: {
    fileSize: config.maxFileSize
  }
});

// Mock data - في الإنتاج، هذا سيأتي من قاعدة البيانات
let firmwareUpdates = [
  {
    id: '1',
    version: '2.2.0',
    filename: 'concretebot_v2.2.0.bin',
    size: 15728640,
    uploadDate: '2024-01-15',
    description: 'Enhanced mixing algorithms, improved layer adhesion, bug fixes for temperature sensors.',
    status: 'pending',
    targetPrinters: ['1', '2', '3', '4'],
    uploadedBy: 'admin',
    checksum: 'sha256:abc123...',
    storageInfo: {
      provider: 'supabase',
      supabaseUrl: null,
      googleDriveId: null
    }
  },
  {
    id: '2',
    version: '2.1.4',
    filename: 'concretebot_v2.1.4.bin',
    size: 14680064,
    uploadDate: '2024-01-10',
    description: 'Critical security update, performance improvements.',
    status: 'completed',
    targetPrinters: ['1', '4'],
    uploadedBy: 'admin',
    checksum: 'sha256:def456...',
    storageInfo: {
      provider: 'supabase',
      supabaseUrl: null,
      googleDriveId: null
    }
  }
];

// الحصول على جميع تحديثات الفيرموير
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json({
      success: true,
      data: firmwareUpdates,
      count: firmwareUpdates.length,
      storageProvider: config.storageProvider
    });
  } catch (error) {
    console.error('Error fetching firmware updates:', error);
    res.status(500).json({ error: 'Failed to fetch firmware updates' });
  }
});

// الحصول على حالة الاتصال بخدمات التخزين
router.get('/storage/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = await storageService.getConnectionStatus();
    res.json({
      success: true,
      data: status,
      currentProvider: config.storageProvider
    });
  } catch (error) {
    console.error('Error getting storage status:', error);
    res.status(500).json({ error: 'Failed to get storage status' });
  }
});

// الحصول على رابط تفويض Google Drive
router.get('/storage/googledrive/auth', authenticateToken, requireAdmin, (req, res) => {
  try {
    const authUrl = storageService.getGoogleDriveAuthUrl();
    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Error getting Google Drive auth URL:', error);
    res.status(500).json({ error: 'Failed to get Google Drive auth URL' });
  }
});

// معالجة callback من Google Drive
router.get('/storage/googledrive/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const tokens = await storageService.exchangeGoogleDriveCode(code);
    
    // في الإنتاج، احفظ الـ refresh token في متغيرات البيئة
    console.log('Google Drive tokens received:', {
      access_token: tokens.access_token ? 'Present' : 'Missing',
      refresh_token: tokens.refresh_token ? 'Present' : 'Missing'
    });

    res.json({
      success: true,
      message: 'Google Drive authorization successful',
      refreshToken: tokens.refresh_token
    });
  } catch (error) {
    console.error('Google Drive callback error:', error);
    res.status(500).json({ error: 'Failed to complete Google Drive authorization' });
  }
});

// رفع فيرموير جديد
router.post('/upload', authenticateToken, requireAdmin, upload.single('firmware'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { version, description, targetPrinters, storageProvider } = req.body;
    
    if (!version || !description) {
      return res.status(400).json({ error: 'Version and description are required' });
    }

    // التحقق من عدم وجود إصدار مماثل
    const existingUpdate = firmwareUpdates.find(u => u.version === version);
    if (existingUpdate) {
      return res.status(400).json({ error: 'Version already exists' });
    }

    // إنشاء اسم ملف فريد
    const fileName = `firmware_${version}_${Date.now()}${path.extname(req.file.originalname)}`;

    // رفع الملف باستخدام StorageService
    const uploadResult = await storageService.uploadFile(
      req.file.buffer, 
      fileName, 
      version,
      { provider: storageProvider }
    );

    const newFirmware = {
      id: uuidv4(),
      version,
      filename: req.file.originalname,
      size: req.file.size,
      uploadDate: new Date().toISOString().split('T')[0],
      description,
      status: 'pending',
      targetPrinters: JSON.parse(targetPrinters || '[]'),
      uploadedBy: req.user.username,
      checksum: `sha256:${Math.random().toString(36).substring(2, 15)}...`,
      storageInfo: {
        provider: uploadResult.provider,
        supabaseUrl: uploadResult.results.supabase?.url || null,
        supabaseDbId: uploadResult.results.supabase?.dbId || null,
        supabasePath: uploadResult.results.supabase?.path || null,
        googleDriveId: uploadResult.results.googleDrive?.id || null,
        googleDriveLink: uploadResult.results.googleDrive?.downloadLink || null,
        googleDriveViewLink: uploadResult.results.googleDrive?.webViewLink || null
      }
    };

    firmwareUpdates.unshift(newFirmware);
    
    res.status(201).json({
      success: true,
      data: newFirmware,
      message: `Firmware uploaded successfully to ${uploadResult.provider}`,
      uploadResult
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

// نشر تحديث الفيرموير
router.post('/:id/deploy', authenticateToken, requireAdmin, (req, res) => {
  try {
    const updateIndex = firmwareUpdates.findIndex(u => u.id === req.params.id);
    if (updateIndex === -1) {
      return res.status(404).json({ error: 'Firmware update not found' });
    }

    const update = firmwareUpdates[updateIndex];
    if (update.status !== 'pending') {
      return res.status(400).json({ error: 'Update is not in pending status' });
    }

    // بدء عملية النشر
    firmwareUpdates[updateIndex].status = 'deploying';
    firmwareUpdates[updateIndex].progress = 0;
    firmwareUpdates[updateIndex].deployedBy = req.user.username;
    firmwareUpdates[updateIndex].deploymentStarted = new Date().toISOString();

    // محاكاة عملية النشر
    simulateDeployment(req.params.id);

    res.json({
      success: true,
      data: firmwareUpdates[updateIndex],
      message: 'Deployment started successfully'
    });
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ error: 'Failed to start deployment' });
  }
});

// إلغاء نشر تحديث الفيرموير
router.post('/:id/cancel', authenticateToken, requireAdmin, (req, res) => {
  try {
    const updateIndex = firmwareUpdates.findIndex(u => u.id === req.params.id);
    if (updateIndex === -1) {
      return res.status(404).json({ error: 'Firmware update not found' });
    }

    const update = firmwareUpdates[updateIndex];
    if (update.status !== 'deploying') {
      return res.status(400).json({ error: 'Update is not currently deploying' });
    }

    firmwareUpdates[updateIndex].status = 'cancelled';
    firmwareUpdates[updateIndex].cancelledBy = req.user.username;
    firmwareUpdates[updateIndex].cancelledAt = new Date().toISOString();

    res.json({
      success: true,
      data: firmwareUpdates[updateIndex],
      message: 'Deployment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel deployment' });
  }
});

// حذف تحديث فيرموير
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updateIndex = firmwareUpdates.findIndex(u => u.id === req.params.id);
    if (updateIndex === -1) {
      return res.status(404).json({ error: 'Firmware update not found' });
    }

    const update = firmwareUpdates[updateIndex];
    
    // منع حذف التحديثات قيد النشر
    if (update.status === 'deploying') {
      return res.status(400).json({ error: 'Cannot delete update that is currently deploying' });
    }

    // حذف الملف من خدمات التخزين
    await storageService.deleteFile({
      supabasePath: update.storageInfo.supabasePath,
      supabaseDbId: update.storageInfo.supabaseDbId,
      googleDriveId: update.storageInfo.googleDriveId
    }, update.storageInfo.provider);

    const deletedUpdate = firmwareUpdates.splice(updateIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedUpdate,
      message: `Firmware update deleted successfully from ${update.storageInfo.provider}`
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete firmware update' });
  }
});

// دالة محاكاة عملية النشر
function simulateDeployment(updateId) {
  const updateIndex = firmwareUpdates.findIndex(u => u.id === updateId);
  if (updateIndex === -1) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15 + 5;
    
    if (progress >= 100) {
      progress = 100;
      firmwareUpdates[updateIndex].status = 'completed';
      firmwareUpdates[updateIndex].progress = 100;
      firmwareUpdates[updateIndex].completedAt = new Date().toISOString();
      
      console.log(`✅ Firmware deployment completed for update ${updateId}`);
      clearInterval(interval);
    } else {
      firmwareUpdates[updateIndex].progress = Math.round(progress);
      console.log(`📡 Deployment progress for ${updateId}: ${Math.round(progress)}%`);
    }
  }, 2000);

  // محاكاة احتمالية فشل (5%)
  setTimeout(() => {
    if (Math.random() < 0.05 && firmwareUpdates[updateIndex].status === 'deploying') {
      firmwareUpdates[updateIndex].status = 'failed';
      firmwareUpdates[updateIndex].error = 'Connection timeout during deployment';
      firmwareUpdates[updateIndex].failedAt = new Date().toISOString();
      clearInterval(interval);
      console.log(`❌ Firmware deployment failed for update ${updateId}`);
    }
  }, 10000);
}

export default router;