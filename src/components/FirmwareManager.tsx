import React, { useState, useEffect } from 'react';
import { FirmwareUpdate, Printer } from '../types';
import { 
  Upload, 
  Download, 
  FileText, 
  Calendar, 
  HardDrive,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Cloud,
  Database,
  Settings,
  Wifi,
  WifiOff
} from 'lucide-react';

interface FirmwareManagerProps {
  updates: FirmwareUpdate[];
  printers: Printer[];
}

interface StorageStatus {
  supabase: { connected: boolean };
  googleDrive: { connected: boolean; user?: any; error?: string };
}

const FirmwareManager: React.FC<FirmwareManagerProps> = ({ updates, printers }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [targetPrinters, setTargetPrinters] = useState<string[]>([]);
  const [storageProvider, setStorageProvider] = useState<'supabase' | 'googledrive' | 'both'>('supabase');
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [showStorageSettings, setShowStorageSettings] = useState(false);

  // جلب حالة خدمات التخزين
  useEffect(() => {
    fetchStorageStatus();
  }, []);

  const fetchStorageStatus = async () => {
    try {
      const response = await fetch('/api/firmware/storage/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStorageStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching storage status:', error);
    }
  };

  const handleGoogleDriveAuth = async () => {
    try {
      const response = await fetch('/api/firmware/storage/googledrive/auth', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.authUrl, '_blank', 'width=500,height=600');
      }
    } catch (error) {
      console.error('Error getting Google Drive auth URL:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !version || !description) {
      alert('Please fill all required fields');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('firmware', selectedFile);
      formData.append('version', version);
      formData.append('description', description);
      formData.append('targetPrinters', JSON.stringify(targetPrinters));
      formData.append('storageProvider', storageProvider);

      const response = await fetch('/api/firmware/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadProgress(100);
        alert(`Firmware uploaded successfully to ${result.uploadResult.provider}!`);
        
        // Reset form
        setSelectedFile(null);
        setVersion('');
        setDescription('');
        setTargetPrinters([]);
        
        // Refresh page to show new firmware
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status: FirmwareUpdate['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'deploying':
        return <Download className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: FirmwareUpdate['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'deploying':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStorageIcon = (provider: string) => {
    switch (provider) {
      case 'supabase':
        return <Database className="w-4 h-4 text-green-600" />;
      case 'googledrive':
        return <Cloud className="w-4 h-4 text-blue-600" />;
      case 'both':
        return (
          <div className="flex space-x-1">
            <Database className="w-3 h-3 text-green-600" />
            <Cloud className="w-3 h-3 text-blue-600" />
          </div>
        );
      default:
        return <HardDrive className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Storage Status Panel */}
      {storageStatus && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Storage Services Status</h2>
            <button
              onClick={() => setShowStorageSettings(!showStorageSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Supabase Storage</p>
                  <p className="text-sm text-gray-600">Database & File Storage</p>
                </div>
              </div>
              {storageStatus.supabase.connected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Cloud className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Google Drive</p>
                  <p className="text-sm text-gray-600">
                    {storageStatus.googleDrive.connected 
                      ? `Connected as ${storageStatus.googleDrive.user?.displayName || 'User'}`
                      : 'Not connected'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {storageStatus.googleDrive.connected ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-red-500" />
                    <button
                      onClick={handleGoogleDriveAuth}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
                    >
                      Connect
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload New Firmware */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Firmware</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Version *
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., 2.3.0"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Storage Provider *
              </label>
              <select
                value={storageProvider}
                onChange={(e) => setStorageProvider(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="supabase">Supabase Storage</option>
                <option value="googledrive">Google Drive</option>
                <option value="both">Both (Backup)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Printers
              </label>
              <select
                multiple
                value={targetPrinters}
                onChange={(e) => setTargetPrinters(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {printers.map(printer => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={3}
              placeholder="Describe the changes in this firmware update..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Firmware File *
            </label>
            <div className="flex items-center space-x-4">
              <label className="relative cursor-pointer bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-orange-400 transition-colors duration-200 flex-1">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      .bin, .hex files up to 50MB
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  className="sr-only"
                  accept=".bin,.hex"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          </div>

          {selectedFile && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">Upload to:</span>
                      {getStorageIcon(storageProvider)}
                      <span className="text-xs font-medium text-gray-700 capitalize">
                        {storageProvider === 'both' ? 'Supabase + Google Drive' : storageProvider}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !version || !description}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>

              {isUploading && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Upload Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Available Firmware Updates */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Firmware Updates</h2>
        
        <div className="space-y-4">
          {updates.map((update) => (
            <div key={update.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Version {update.version}
                  </h3>
                  <p className="text-sm text-gray-600">{update.filename}</p>
                  
                  {/* Storage Info */}
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs text-gray-500">Stored on:</span>
                    {getStorageIcon(update.storageInfo?.provider || 'unknown')}
                    <span className="text-xs font-medium text-gray-700 capitalize">
                      {update.storageInfo?.provider || 'Unknown'}
                    </span>
                    
                    {/* Storage Links */}
                    <div className="flex space-x-2 ml-2">
                      {update.storageInfo?.supabaseUrl && (
                        <a 
                          href={update.storageInfo.supabaseUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-xs text-green-600 hover:text-green-800"
                        >
                          <Database className="w-3 h-3" />
                          <span>Supabase</span>
                        </a>
                      )}
                      {update.storageInfo?.googleDriveViewLink && (
                        <a 
                          href={update.storageInfo.googleDriveViewLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <Cloud className="w-3 h-3" />
                          <span>Drive</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(update.status)}`}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(update.status)}
                    <span className="capitalize">{update.status}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{update.description}</p>

              <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{update.uploadDate}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <HardDrive className="w-4 h-4" />
                  <span>{formatFileSize(update.size)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>{update.targetPrinters.length} printers targeted</span>
                </div>
              </div>

              {update.status === 'deploying' && update.progress !== undefined && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Deployment Progress</span>
                    <span>{update.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${update.progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Target printers: {update.targetPrinters.map(id => {
                    const printer = printers.find(p => p.id === id);
                    return printer?.name;
                  }).join(', ')}
                </div>
                
                {update.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200">
                      <div className="flex items-center space-x-1">
                        <Play className="w-3 h-3" />
                        <span>Deploy</span>
                      </div>
                    </button>
                    <button className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200">
                      <div className="flex items-center space-x-1">
                        <Pause className="w-3 h-3" />
                        <span>Cancel</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FirmwareManager;