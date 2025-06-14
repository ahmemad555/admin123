import React from 'react';
import { Printer } from '../types';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  AlertTriangle, 
  Battery, 
  Thermometer,
  MapPin,
  Clock,
  Building2
} from 'lucide-react';

interface PrintersOverviewProps {
  printers: Printer[];
}

const PrintersOverview: React.FC<PrintersOverviewProps> = ({ printers }) => {
  const getStatusIcon = (status: Printer['status']) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'offline':
        return <WifiOff className="w-5 h-5 text-gray-400" />;
      case 'updating':
        return <Download className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Printer['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'offline':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'updating':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getBatteryColor = (level?: number) => {
    if (!level) return 'text-gray-400';
    if (level > 50) return 'text-green-500';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const onlinePrinters = printers.filter(p => p.status === 'online').length;
  const updatingPrinters = printers.filter(p => p.status === 'updating').length;
  const offlinePrinters = printers.filter(p => p.status === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Printers</p>
              <p className="text-3xl font-bold text-gray-900">{printers.length}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Online</p>
              <p className="text-3xl font-bold text-green-600">{onlinePrinters}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Updating</p>
              <p className="text-3xl font-bold text-blue-600">{updatingPrinters}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Offline</p>
              <p className="text-3xl font-bold text-gray-600">{offlinePrinters}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <WifiOff className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Printers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {printers.map((printer) => (
          <div key={printer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{printer.name}</h3>
                <p className="text-sm text-gray-600">{printer.model}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(printer.status)}`}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(printer.status)}
                  <span className="capitalize">{printer.status}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{printer.location}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Last seen: {printer.lastSeen}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {printer.batteryLevel !== undefined && (
                    <div className="flex items-center space-x-1">
                      <Battery className={`w-4 h-4 ${getBatteryColor(printer.batteryLevel)}`} />
                      <span className="text-sm text-gray-600">{printer.batteryLevel}%</span>
                    </div>
                  )}
                  
                  {printer.temperature !== undefined && (
                    <div className="flex items-center space-x-1">
                      <Thermometer className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600">{printer.temperature}°C</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">Firmware</p>
                  <p className="text-sm font-medium text-gray-900">v{printer.firmwareVersion}</p>
                </div>
              </div>

              {printer.status === 'updating' && printer.printProgress !== undefined && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Update Progress</span>
                    <span>{printer.printProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${printer.printProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrintersOverview;