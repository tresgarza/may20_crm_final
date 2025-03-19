import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error' | 'ghost' | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  isOutlined?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  isOutlined = false,
  leftIcon,
  rightIcon,
  className = '',
  ...rest
}) => {
  const baseClass = 'btn';
  const variantClass = isOutlined ? `btn-outline btn-${variant}` : `btn-${variant}`;
  const sizeClass = size !== 'md' ? `btn-${size}` : '';
  const loadingClass = isLoading ? 'loading' : '';
  const disabledClass = isDisabled ? 'btn-disabled' : '';
  
  const buttonClass = [
    baseClass,
    variantClass,
    sizeClass,
    loadingClass,
    disabledClass,
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <button
      className={buttonClass}
      disabled={isDisabled || isLoading}
      {...rest}
    >
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default ActionButton; 