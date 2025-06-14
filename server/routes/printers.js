import express from 'express';
import { authenticateToken, requireAdmin, requireOperator } from '../middleware/auth.js';

const router = express.Router();

// Mock data - في الإنتاج، استخدم قاعدة بيانات حقيقية
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
    ipAddress: '192.168.1.101',
    serialNumber: 'CB3000-001'
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
    ipAddress: '192.168.1.102',
    serialNumber: 'CB3000-002'
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
    ipAddress: '192.168.1.103',
    serialNumber: 'CBPRO-001'
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
    ipAddress: '192.168.1.104',
    serialNumber: 'CB3000-004'
  }
];

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

// الحصول على جميع الطابعات
router.get('/', authenticateToken, (req, res) => {
  try {
    // تحديث آخر مرة شوهدت فيها الطابعات المتصلة
    const updatedPrinters = printers.map(printer => {
      if (printer.status === 'online') {
        return {
          ...printer,
          lastSeen: getRelativeTime(new Date())
        };
      }
      return {
        ...printer,
        lastSeen: getRelativeTime(new Date(printer.lastSeen))
      };
    });
    
    res.json({
      success: true,
      data: updatedPrinters,
      count: updatedPrinters.length
    });
  } catch (error) {
    console.error('Error fetching printers:', error);
    res.status(500).json({ error: 'Failed to fetch printers' });
  }
});

// الحصول على طابعة محددة
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const printer = printers.find(p => p.id === req.params.id);
    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }
    
    res.json({
      success: true,
      data: {
        ...printer,
        lastSeen: getRelativeTime(new Date(printer.lastSeen))
      }
    });
  } catch (error) {
    console.error('Error fetching printer:', error);
    res.status(500).json({ error: 'Failed to fetch printer' });
  }
});

// تحديث حالة الطابعة (للأدمن فقط)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const printerIndex = printers.findIndex(p => p.id === req.params.id);
    if (printerIndex === -1) {
      return res.status(404).json({ error: 'Printer not found' });
    }

    const allowedUpdates = ['name', 'location', 'status', 'batteryLevel', 'temperature', 'printProgress'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    printers[printerIndex] = { 
      ...printers[printerIndex], 
      ...updates,
      lastSeen: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: printers[printerIndex],
      message: 'Printer updated successfully'
    });
  } catch (error) {
    console.error('Error updating printer:', error);
    res.status(500).json({ error: 'Failed to update printer' });
  }
});

// إضافة طابعة جديدة (للأدمن فقط)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, model, location, ipAddress, serialNumber } = req.body;
    
    if (!name || !model || !location) {
      return res.status(400).json({ error: 'Name, model, and location are required' });
    }

    const newPrinter = {
      id: Date.now().toString(),
      name,
      model,
      location,
      status: 'offline',
      firmwareVersion: '1.0.0',
      lastSeen: new Date().toISOString(),
      batteryLevel: 0,
      temperature: 20,
      printProgress: 0,
      ipAddress: ipAddress || '',
      serialNumber: serialNumber || ''
    };

    printers.push(newPrinter);
    
    res.status(201).json({
      success: true,
      data: newPrinter,
      message: 'Printer added successfully'
    });
  } catch (error) {
    console.error('Error adding printer:', error);
    res.status(500).json({ error: 'Failed to add printer' });
  }
});

// حذف طابعة (للأدمن فقط)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const printerIndex = printers.findIndex(p => p.id === req.params.id);
    if (printerIndex === -1) {
      return res.status(404).json({ error: 'Printer not found' });
    }

    const deletedPrinter = printers.splice(printerIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedPrinter,
      message: 'Printer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting printer:', error);
    res.status(500).json({ error: 'Failed to delete printer' });
  }
});

// إحصائيات الطابعات
router.get('/stats/overview', authenticateToken, (req, res) => {
  try {
    const stats = {
      total: printers.length,
      online: printers.filter(p => p.status === 'online').length,
      offline: printers.filter(p => p.status === 'offline').length,
      updating: printers.filter(p => p.status === 'updating').length,
      error: printers.filter(p => p.status === 'error').length,
      averageBattery: Math.round(
        printers.reduce((sum, p) => sum + (p.batteryLevel || 0), 0) / printers.length
      ),
      averageTemperature: Math.round(
        printers.reduce((sum, p) => sum + (p.temperature || 0), 0) / printers.length
      )
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching printer stats:', error);
    res.status(500).json({ error: 'Failed to fetch printer statistics' });
  }
});

export default router;