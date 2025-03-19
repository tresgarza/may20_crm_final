import React from 'react';
import { APPLICATION_STATUS, STATUS_LABELS, STATUS_COLORS } from '../../utils/constants/statuses';

interface StatusBadgeProps {
  status: APPLICATION_STATUS;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const label = STATUS_LABELS[status] || status;
  const color = STATUS_COLORS[status] || 'neutral';

  return (
    <span className={`badge badge-${color} ${className}`}>
      {label}
    </span>
  );
};

export default StatusBadge; 