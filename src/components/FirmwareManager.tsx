import React, { useState } from 'react';
import { FirmwareUpdate, Printer } from '../types';
import { supabase, uploadFirmware } from '../lib/supabase';
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
  ExternalLink
} from 'lucide-react';

interface FirmwareManagerProps {
  updates: FirmwareUpdate[];
  printers: Printer[];
}

const FirmwareManager: React.FC<FirmwareManagerProps> = ({ updates, printers }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [targetPrinters, setTargetPrinters] = useState<string[]>([]);

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
      // رفع الملف إلى Supabase Storage
      const { url } = await uploadFirmware(selectedFile, version);

      // إرسال البيانات إلى الـ API
      const formData = new FormData();
      formData.append('version', version);
      formData.append('description', description);
      formData.append('targetPrinters', JSON.stringify(targetPrinters));
      formData.append('fileUrl', url);
      formData.append('fileSize', selectedFile.size.toString());

      const response = await fetch('/api/firmware/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        setUploadProgress(100);
        alert('Firmware uploaded successfully to Supabase Storage!');
        
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

  return (
    <div className="space-y-6">
      {/* Upload New Firmware */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Firmware to Supabase Storage</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || !version || !description}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isUploading ? 'Uploading to Supabase...' : 'Upload to Supabase'}
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
                  {update.url && (
                    <a 
                      href={update.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View in Supabase Storage</span>
                    </a>
                  )}
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