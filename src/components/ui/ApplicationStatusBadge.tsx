import React from 'react';
import { APPLICATION_STATUS, STATUS_LABELS, STATUS_COLORS } from '../../utils/constants/statuses';

interface ApplicationStatusBadgeProps {
  status: keyof typeof APPLICATION_STATUS | string;
  className?: string;
}

const ApplicationStatusBadge: React.FC<ApplicationStatusBadgeProps> = ({ 
  status, 
  className = '' 
}) => {
  const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'neutral';

  return (
    <span className={`badge badge-${color} ${className}`}>
      {label}
    </span>
  );
};

export default ApplicationStatusBadge; 