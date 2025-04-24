import * as React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  valueClassName?: string;
  titleClassName?: string;
  footerClassName?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  footer,
  className = '',
  valueClassName = '',
  titleClassName = '',
  footerClassName = '',
  trend,
}) => {
  return (
    <div className={`stat bg-base-100 shadow rounded-lg ${className}`}>
      <div className="flex justify-between items-start">
        <div className={`stat-title text-xs opacity-70 ${titleClassName}`}>{title}</div>
        {icon && <div className="stat-figure text-secondary">{icon}</div>}
      </div>
      <div className={`stat-value text-2xl font-bold mt-2 ${valueClassName}`}>
        {value}
        {trend && (
          <span className={`text-sm ml-2 ${trend.isPositive ? 'text-success' : 'text-error'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {footer && <div className={`stat-desc mt-1 text-xs ${footerClassName}`}>{footer}</div>}
    </div>
  );
};

export default StatCard; 