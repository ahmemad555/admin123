import React from 'react';
import { UpdateHistory } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Clock,
  Printer
} from 'lucide-react';

interface UpdateHistoryProps {
  history: UpdateHistory[];
}

const UpdateHistoryComponent: React.FC<UpdateHistoryProps> = ({ history }) => {
  const getStatusIcon = (status: UpdateHistory['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'rolled_back':
        return <RotateCcw className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: UpdateHistory['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'rolled_back':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: UpdateHistory['status']) => {
    switch (status) {
      case 'success':
        return 'Successful';
      case 'failed':
        return 'Failed';
      case 'rolled_back':
        return 'Rolled Back';
      default:
        return 'Unknown';
    }
  };

  // Group history by date
  const groupedHistory = history.reduce((groups, item) => {
    const date = item.timestamp.split(' ')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {} as Record<string, UpdateHistory[]>);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Update History</h2>
        
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No update history</h3>
            <p className="mt-1 text-sm text-gray-500">
              Update history will appear here once firmware updates are deployed.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, items]) => (
                <div key={date} className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                  
                  <div className="space-y-3">
                    {items
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className="mt-0.5">
                                <Printer className="w-5 h-5 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {item.printerName}
                                  </h4>
                                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                                    <div className="flex items-center space-x-1">
                                      {getStatusIcon(item.status)}
                                      <span>{getStatusText(item.status)}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="mt-1 text-sm text-gray-600">
                                  Updated from <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">v{item.fromVersion}</span> 
                                  {' '} to <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">v{item.toVersion}</span>
                                </div>
                                
                                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{item.timestamp.split(' ')[1]}</span>
                                  </div>
                                  <span>•</span>
                                  <span>Duration: {item.duration}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateHistoryComponent;