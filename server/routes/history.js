import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Mock data
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
    initiatedBy: 'admin',
    notes: 'Routine security update'
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
    initiatedBy: 'admin',
    notes: 'Routine security update'
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
    initiatedBy: 'operator',
    notes: 'Connection lost during update',
    errorMessage: 'Network timeout after 3 minutes'
  },
  {
    id: '4',
    printerId: '2',
    printerName: 'Concrete Printer B2',
    fromVersion: '2.1.2',
    toVersion: '2.1.3',
    timestamp: '2024-01-05 16:45',
    status: 'rolled_back',
    duration: '12m 33s',
    initiatedBy: 'admin',
    notes: 'Update caused stability issues, rolled back automatically',
    errorMessage: 'Firmware validation failed'
  }
];

// الحصول على تاريخ التحديثات
router.get('/', authenticateToken, (req, res) => {
  try {
    const { printerId, status, limit = 50, offset = 0 } = req.query;
    
    let filteredHistory = [...updateHistory];
    
    // تصفية حسب معرف الطابعة
    if (printerId) {
      filteredHistory = filteredHistory.filter(h => h.printerId === printerId);
    }
    
    // تصفية حسب الحالة
    if (status) {
      filteredHistory = filteredHistory.filter(h => h.status === status);
    }
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // تطبيق التصفح
    const paginatedHistory = filteredHistory.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );
    
    res.json({
      success: true,
      data: paginatedHistory,
      pagination: {
        total: filteredHistory.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: filteredHistory.length > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching update history:', error);
    res.status(500).json({ error: 'Failed to fetch update history' });
  }
});

// الحصول على سجل تحديث محدد
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const historyEntry = updateHistory.find(h => h.id === req.params.id);
    if (!historyEntry) {
      return res.status(404).json({ error: 'History entry not found' });
    }
    
    res.json({
      success: true,
      data: historyEntry
    });
  } catch (error) {
    console.error('Error fetching history entry:', error);
    res.status(500).json({ error: 'Failed to fetch history entry' });
  }
});

// إضافة سجل تحديث جديد (للأدمن فقط)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      printerId,
      printerName,
      fromVersion,
      toVersion,
      status,
      duration,
      notes,
      errorMessage
    } = req.body;
    
    if (!printerId || !printerName || !fromVersion || !toVersion || !status) {
      return res.status(400).json({ 
        error: 'printerId, printerName, fromVersion, toVersion, and status are required' 
      });
    }
    
    const newHistoryEntry = {
      id: uuidv4(),
      printerId,
      printerName,
      fromVersion,
      toVersion,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status,
      duration: duration || '0m 0s',
      initiatedBy: req.user.username,
      notes: notes || '',
      errorMessage: errorMessage || null
    };
    
    updateHistory.unshift(newHistoryEntry);
    
    res.status(201).json({
      success: true,
      data: newHistoryEntry,
      message: 'History entry added successfully'
    });
  } catch (error) {
    console.error('Error adding history entry:', error);
    res.status(500).json({ error: 'Failed to add history entry' });
  }
});

// تحديث سجل تحديث (للأدمن فقط)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const historyIndex = updateHistory.findIndex(h => h.id === req.params.id);
    if (historyIndex === -1) {
      return res.status(404).json({ error: 'History entry not found' });
    }
    
    const allowedUpdates = ['status', 'duration', 'notes', 'errorMessage'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    updateHistory[historyIndex] = {
      ...updateHistory[historyIndex],
      ...updates,
      updatedBy: req.user.username,
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: updateHistory[historyIndex],
      message: 'History entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating history entry:', error);
    res.status(500).json({ error: 'Failed to update history entry' });
  }
});

// حذف سجل تحديث (للأدمن فقط)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const historyIndex = updateHistory.findIndex(h => h.id === req.params.id);
    if (historyIndex === -1) {
      return res.status(404).json({ error: 'History entry not found' });
    }
    
    const deletedEntry = updateHistory.splice(historyIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedEntry,
      message: 'History entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting history entry:', error);
    res.status(500).json({ error: 'Failed to delete history entry' });
  }
});

// إحصائيات التحديثات
router.get('/stats/overview', authenticateToken, (req, res) => {
  try {
    const stats = {
      total: updateHistory.length,
      successful: updateHistory.filter(h => h.status === 'success').length,
      failed: updateHistory.filter(h => h.status === 'failed').length,
      rolledBack: updateHistory.filter(h => h.status === 'rolled_back').length,
      recentUpdates: updateHistory
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5),
      successRate: updateHistory.length > 0 
        ? Math.round((updateHistory.filter(h => h.status === 'success').length / updateHistory.length) * 100)
        : 0
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching history stats:', error);
    res.status(500).json({ error: 'Failed to fetch history statistics' });
  }
});

export default router;