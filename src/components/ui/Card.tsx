import * as React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  actions,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  footer,
}) => {
  return (
    <div className={`card bg-base-100 shadow-md ${className}`}>
      {(title || actions) && (
        <div className={`card-title p-4 flex justify-between items-center ${headerClassName}`}>
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className={`card-body p-4 pt-0 ${bodyClassName}`}>{children}</div>
      {footer && (
        <div className={`card-footer p-4 pt-0 ${footerClassName}`}>{footer}</div>
      )}
    </div>
  );
};

export default Card; 