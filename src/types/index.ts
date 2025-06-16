export interface User {
  id: string;
  username: string;
  role: 'admin' | 'operator';
}

export interface Printer {
  id: string;
  name: string;
  model: string;
  location: string;
  status: 'online' | 'offline' | 'updating' | 'error';
  firmwareVersion: string;
  lastSeen: string;
  batteryLevel?: number;
  temperature?: number;
  printProgress?: number;
}

export interface FirmwareUpdate {
  id: string;
  version: string;
  filename: string;
  size: number;
  uploadDate: string;
  description: string;
  status: 'pending' | 'deploying' | 'completed' | 'failed';
  targetPrinters: string[];
  progress?: number;
  storageInfo?: {
    provider: 'supabase' | 'googledrive' | 'both';
    supabaseUrl?: string;
    supabaseDbId?: string;
    supabasePath?: string;
    googleDriveId?: string;
    googleDriveLink?: string;
    googleDriveViewLink?: string;
  };
}

export interface UpdateHistory {
  id: string;
  printerId: string;
  printerName: string;
  fromVersion: string;
  toVersion: string;
  timestamp: string;
  status: 'success' | 'failed' | 'rolled_back';
  duration: string;
}