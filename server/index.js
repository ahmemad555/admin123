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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
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
    const allowedTypes = ['.bin', '.hex'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only .bin and .hex files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Mock database - في الإنتاج، استخدم قاعدة بيانات حقيقية
let users = [
  {
    id: '1',
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin'
  },
  {
    id: '2',
    username: 'operator',
    password: bcrypt.hashSync('op123', 10),
    role: 'operator'
  }
];

let printers = [
  {
    id: '1',
    name: 'Concrete Printer A1',
    model: 'ConcreteBot 3000',
    location: 'Site A - Building 1',
    status: 'online',
    firmwareVersion: '2.1.4',
    lastSeen: new Date().toISOString(),
    batteryLevel: 85,
    temperature: 22,
    printProgress: 0,
  },
  {
    id: '2',
    name: 'Concrete Printer B2',
    model: 'ConcreteBot 3000',
    location: 'Site B - Foundation',
    status: 'updating',
    firmwareVersion: '2.1.3',
    lastSeen: new Date().toISOString(),
    batteryLevel: 92,
    temperature: 24,
    printProgress: 45,
  },
  {
    id: '3',
    name: 'Concrete Printer C3',
    model: 'ConcreteBot Pro',
    location: 'Site C - Walls',
    status: 'offline',
    firmwareVersion: '2.0.8',
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    batteryLevel: 15,
    temperature: 19,
    printProgress: 0,
  },
  {
    id: '4',
    name: 'Concrete Printer D4',
    model: 'ConcreteBot 3000',
    location: 'Site A - Building 2',
    status: 'online',
    firmwareVersion: '2.1.4',
    lastSeen: new Date().toISOString(),
    batteryLevel: 78,
    temperature: 23,
    printProgress: 0,
  }
];

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
  }
];

let updateHistory = [
  {
    id: '1',
    printerId: '1',
    printerName: 'Concrete Printer A1',
    fromVersion: '2.1.3',
    toVersion: '2.1.4',
    timestamp: '2024-01-10 14:30',
    status: 'success',
    duration: '8m 45s',
  },
  {
    id: '2',
    printerId: '4',
    printerName: 'Concrete Printer D4',
    fromVersion: '2.1.3',
    toVersion: '2.1.4',
    timestamp: '2024-01-10 14:25',
    status: 'success',
    duration: '9m 12s',
  },
  {
    id: '3',
    printerId: '3',
    printerName: 'Concrete Printer C3',
    fromVersion: '2.0.7',
    toVersion: '2.0.8',
    timestamp: '2024-01-08 09:15',
    status: 'failed',
    duration: '3m 22s',
  }
];

// Middleware للتحقق من الـ JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware للتحقق من صلاحيات الأدمن
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Routes

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// الحصول على جميع الطابعات
app.get('/api/printers', authenticateToken, (req, res) => {
  // تحديث آخر مرة شوهدت فيها الطابعات المتصلة
  const updatedPrinters = printers.map(printer => {
    if (printer.status === 'online') {
      return {
        ...printer,
        lastSeen: getRelativeTime(new Date())
      };
    }
    return printer;
  });
  
  res.json(updatedPrinters);
});

// الحصول على طابعة محددة
app.get('/api/printers/:id', authenticateToken, (req, res) => {
  const printer = printers.find(p => p.id === req.params.id);
  if (!printer) {
    return res.status(404).json({ error: 'Printer not found' });
  }
  res.json(printer);
});

// تحديث حالة الطابعة
app.put('/api/printers/:id', authenticateToken, requireAdmin, (req, res) => {
  const printerIndex = printers.findIndex(p => p.id === req.params.id);
  if (printerIndex === -1) {
    return res.status(404).json({ error: 'Printer not found' });
  }

  printers[printerIndex] = { ...printers[printerIndex], ...req.body };
  res.json(printers[printerIndex]);
});

// الحصول على تحديثات الفيرموير
app.get('/api/firmware', authenticateToken, requireAdmin, (req, res) => {
  res.json(firmwareUpdates);
});

// رفع فيرموير جديد
app.post('/api/firmware/upload', authenticateToken, requireAdmin, upload.single('firmware'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { version, description, targetPrinters } = req.body;
    
    if (!version || !description) {
      return res.status(400).json({ error: 'Version and description are required' });
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
      filePath: req.file.path
    };

    firmwareUpdates.unshift(newFirmware);
    res.json(newFirmware);
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// نشر تحديث الفيرموير
app.post('/api/firmware/:id/deploy', authenticateToken, requireAdmin, (req, res) => {
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

  // محاكاة عملية النشر
  simulateDeployment(req.params.id);

  res.json({ message: 'Deployment started', update: firmwareUpdates[updateIndex] });
});

// الحصول على تاريخ التحديثات
app.get('/api/history', authenticateToken, (req, res) => {
  res.json(updateHistory);
});

// إضافة سجل تحديث جديد
app.post('/api/history', authenticateToken, requireAdmin, (req, res) => {
  const newHistoryEntry = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString()
  };
  
  updateHistory.unshift(newHistoryEntry);
  res.json(newHistoryEntry);
});

// دالة مساعدة لمحاكاة عملية النشر
function simulateDeployment(updateId) {
  const updateIndex = firmwareUpdates.findIndex(u => u.id === updateId);
  if (updateIndex === -1) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 20;
    if (progress >= 100) {
      progress = 100;
      firmwareUpdates[updateIndex].status = 'completed';
      firmwareUpdates[updateIndex].progress = 100;
      
      // تحديث إصدار الفيرموير للطابعات المستهدفة
      const update = firmwareUpdates[updateIndex];
      update.targetPrinters.forEach(printerId => {
        const printerIndex = printers.findIndex(p => p.id === printerId);
        if (printerIndex !== -1) {
          printers[printerIndex].firmwareVersion = update.version;
          printers[printerIndex].status = 'online';
        }
      });

      clearInterval(interval);
    } else {
      firmwareUpdates[updateIndex].progress = Math.round(progress);
    }
  }, 1000);
}

// دالة مساعدة لحساب الوقت النسبي
function getRelativeTime(date) {
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}

// WebSocket للتحديثات المباشرة (اختياري)
app.get('/api/status', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    printersCount: printers.length,
    onlinePrinters: printers.filter(p => p.status === 'online').length
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`🚀 FOTA Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`📁 File uploads directory: ${uploadsDir}`);
});