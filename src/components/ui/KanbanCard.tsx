import React from 'react';
import { Application } from '../../utils/types';
// Conditionally use the UserAvatar component if it exists, or just return a simple avatar
// import UserAvatar from './UserAvatar';
// import { formatCurrency } from '../../utils/formatters';

interface KanbanCardProps {
  app: Application;
  onClick: (app: Application) => void;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, app: Application) => void;
  processingAppId?: string;
}

// Function to get card color based on status
const getCardColor = (app: Application): string => {
  const status = app.status ? app.status.toLowerCase() : '';
  
  // Status-based colors
  if (status.includes('rechaz') || status === 'rejected') {
    return 'border-red-500 bg-red-50';
  } else if (status.includes('aprob') || status === 'approved') {
    return 'border-green-500 bg-green-50';
  } else if (status.includes('revision') || status === 'review') {
    return 'border-blue-400 bg-blue-50';
  } else if (status.includes('pendiente') || status === 'pending') {
    return 'border-yellow-500 bg-yellow-50';
  } else if (status.includes('complet') || status === 'completed') {
    return 'border-indigo-500 bg-indigo-50';
  } else if (status.includes('cancel') || status === 'cancelled') {
    return 'border-gray-500 bg-gray-50';
  } else if (status.includes('dispers')) {
    // Handle both 'por_dispersar' and 'dispersado'
    return status.includes('por') ? 'border-purple-500 bg-purple-50' : 'border-teal-500 bg-teal-50';
  }
  
  // Default color
  return 'border-gray-300 bg-white';
};

// Simple currency formatter to avoid import issues
const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const KanbanCard: React.FC<KanbanCardProps> = ({ 
  app, 
  onClick, 
  isDragging, 
  onDragStart,
  processingAppId
}) => {
  // Special approval indicators - handle potentially undefined values
  const hasAdvisorApproval = app.approved_by_advisor || false;
  const hasCompanyApproval = app.approved_by_company || false;
  
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart && onDragStart(e, app)}
      onClick={() => onClick(app)}
      className={`card shadow hover:shadow-lg transition-all ${getCardColor(app)} border-l-4 border-t border-r border-b hover:border-primary kanban-card relative ${app.id === processingAppId ? 'processing' : ''} ${app.isMoving ? 'opacity-90' : ''}`}
    >
      {/* Processing indicator */}
      {app.id === processingAppId && (
        <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center">
          <div className="loader"></div>
        </div>
      )}
      
      {/* Approval indicators */}
      <div className="absolute top-0 right-0 flex">
        {hasAdvisorApproval && (
          <span className="text-sm bg-green-500 text-white px-1 rounded-bl">
            A
          </span>
        )}
        {hasCompanyApproval && (
          <span className="text-sm bg-blue-500 text-white px-1 rounded-bl ml-1">
            E
          </span>
        )}
      </div>
      
      <div className="card-body p-3">
        <div className="flex flex-col">
          <h3 className="font-medium text-sm">{app.client_name || 'Sin nombre'}</h3>
          <p className="text-xs text-gray-600 truncate">{app.client_phone || 'Sin contacto'}</p>
          <div className="flex justify-between items-center mt-2">
            <span className="badge badge-sm">{app.company_name}</span>
            <span className="text-xs font-bold">{formatCurrency(app.amount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanCard; 