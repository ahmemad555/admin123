import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { config } from '../config.js';

const router = express.Router();

// إنشاء مجلد الرفع إذا لم يكن موجوداً
const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// إعداد multer لرفع الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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

// Mock data
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
    checksum: 'sha256:abc123...'
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
    checksum: 'sha256:def456...'
  }
];

// الحصول على جميع تحديثات الفيرموير
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json({
      success: true,
      data: firmwareUpdates,
      count: firmwareUpdates.length
    });
  } catch (error) {
    console.error('Error fetching firmware updates:', error);
    res.status(500).json({ error: 'Failed to fetch firmware updates' });
  }
});

// الحصول على تحديث فيرموير محدد
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const update = firmwareUpdates.find(u => u.id === req.params.id);
    if (!update) {
      return res.status(404).json({ error: 'Firmware update not found' });
    }
    
    res.json({
      success: true,
      data: update
    });
  } catch (error) {
    console.error('Error fetching firmware update:', error);
    res.status(500).json({ error: 'Failed to fetch firmware update' });
  }
});

// رفع فيرموير جديد
router.post('/upload', authenticateToken, requireAdmin, upload.single('firmware'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { version, description, targetPrinters } = req.body;
    
    if (!version || !description) {
      // حذف الملف المرفوع إذا كانت البيانات ناقصة
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Version and description are required' });
    }

    // التحقق من عدم وجود إصدار مماثل
    const existingUpdate = firmwareUpdates.find(u => u.version === version);
    if (existingUpdate) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Version already exists' });
    }

    const newFirmware = {
      id: uuidv4(),
      version,
      filename: req.file.originalname,
      size: req.file.size,
      uploadDate: new Date().toISOString().split('T')[0],
      description,
      status: 'pending',
      targetPrinters: JSON.parse(targetPrinters || '[]'),
      filePath: req.file.path,
      uploadedBy: req.user.username,
      checksum: `sha256:${Math.random().toString(36).substring(2, 15)}...` // في الإنتاج، احسب الـ checksum الحقيقي
    };

    firmwareUpdates.unshift(newFirmware);
    
    res.status(201).json({
      success: true,
      data: newFirmware,
      message: 'Firmware uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    // حذف الملف في حالة حدوث خطأ
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Upload failed' });
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
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
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

    // حذف الملف من النظام
    if (update.filePath && fs.existsSync(update.filePath)) {
      fs.unlinkSync(update.filePath);
    }

    const deletedUpdate = firmwareUpdates.splice(updateIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedUpdate,
      message: 'Firmware update deleted successfully'
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
    // محاكاة تقدم عشوائي
    progress += Math.random() * 15 + 5; // تقدم بين 5-20% في كل مرة
    
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
  }, 2000); // تحديث كل ثانيتين

  // محاكاة احتمالية فشل (5%)
  setTimeout(() => {
    if (Math.random() < 0.05 && firmwareUpdates[updateIndex].status === 'deploying') {
      firmwareUpdates[updateIndex].status = 'failed';
      firmwareUpdates[updateIndex].error = 'Connection timeout during deployment';
      firmwareUpdates[updateIndex].failedAt = new Date().toISOString();
      clearInterval(interval);
      console.log(`❌ Firmware deployment failed for update ${updateId}`);
    }
  }, 10000); // فحص الفشل بعد 10 ثوان
}

export default router;