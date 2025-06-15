import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { config, supabase } from '../config.js';

const router = express.Router();

// إعداد multer للذاكرة المؤقتة (بدلاً من حفظ الملفات محلياً)
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
    url: null
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
    url: null
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

// رفع فيرموير جديد إلى Supabase Storage
router.post('/upload', authenticateToken, requireAdmin, upload.single('firmware'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { version, description, targetPrinters } = req.body;
    
    if (!version || !description) {
      return res.status(400).json({ error: 'Version and description are required' });
    }

    // التحقق من عدم وجود إصدار مماثل
    const existingUpdate = firmwareUpdates.find(u => u.version === version);
    if (existingUpdate) {
      return res.status(400).json({ error: 'Version already exists' });
    }

    // رفع الملف إلى Supabase Storage
    const fileName = `firmware_${version}_${Date.now()}${path.extname(req.file.originalname)}`;
    const filePath = `firmware/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('firmware')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    // الحصول على الـ public URL
    const { data: urlData } = supabase.storage
      .from('firmware')
      .getPublicUrl(filePath);

    // إضافة السجل إلى قاعدة البيانات
    const { data: dbData, error: dbError } = await supabase
      .from('firmware_updates')
      .insert([
        {
          version,
          url: urlData.publicUrl
        }
      ])
      .select();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // حذف الملف من Storage في حالة فشل إدراج قاعدة البيانات
      await supabase.storage.from('firmware').remove([filePath]);
      return res.status(500).json({ error: 'Failed to save firmware record' });
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
      uploadedBy: req.user.username,
      checksum: `sha256:${Math.random().toString(36).substring(2, 15)}...`,
      url: urlData.publicUrl,
      supabaseId: dbData[0].id
    };

    firmwareUpdates.unshift(newFirmware);
    
    res.status(201).json({
      success: true,
      data: newFirmware,
      message: 'Firmware uploaded successfully to Supabase Storage'
    });
  } catch (error) {
    console.error('Upload error:', error);
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

    // حذف الملف من Supabase Storage
    if (update.url) {
      const filePath = update.url.split('/').pop();
      await supabase.storage.from('firmware').remove([`firmware/${filePath}`]);
    }

    // حذف السجل من قاعدة البيانات
    if (update.supabaseId) {
      await supabase
        .from('firmware_updates')
        .delete()
        .eq('id', update.supabaseId);
    }

    const deletedUpdate = firmwareUpdates.splice(updateIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedUpdate,
      message: 'Firmware update deleted successfully from Supabase'
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