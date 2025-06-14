import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import PrintersOverview from './PrintersOverview';
import FirmwareManager from './FirmwareManager';
import UpdateHistory from './UpdateHistory';
import { Printer, FirmwareUpdate, UpdateHistory as UpdateHistoryType } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'firmware' | 'history'>('overview');

  // Mock data - in production, this would come from APIs
  const [printers] = useState<Printer[]>([
    {
      id: '1',
      name: 'Concrete Printer A1',
      model: 'ConcreteBot 3000',
      location: 'Site A - Building 1',
      status: 'online',
      firmwareVersion: '2.1.4',
      lastSeen: '2 minutes ago',
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
      lastSeen: '1 minute ago',
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
      lastSeen: '2 hours ago',
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
      lastSeen: '5 minutes ago',
      batteryLevel: 78,
      temperature: 23,
      printProgress: 0,
    },
  ]);

  const [firmwareUpdates] = useState<FirmwareUpdate[]>([
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
    },
  ]);

  const [updateHistory] = useState<UpdateHistoryType[]>([
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
    },
  ]);

  const tabs = [
    { id: 'overview', label: 'Printers Overview', adminOnly: false },
    { id: 'firmware', label: 'Firmware Manager', adminOnly: true },
    { id: 'history', label: 'Update History', adminOnly: false },
  ] as const;

  const filteredTabs = tabs.filter(tab => !tab.adminOnly || user?.role === 'admin');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {filteredTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'overview' && <PrintersOverview printers={printers} />}
          {activeTab === 'firmware' && user?.role === 'admin' && (
            <FirmwareManager updates={firmwareUpdates} printers={printers} />
          )}
          {activeTab === 'history' && <UpdateHistory history={updateHistory} />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;