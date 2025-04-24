import * as React from 'react';

interface UserAvatarProps {
  name?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  name = '',
  imageUrl,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };
  
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  return (
    <div className={`avatar placeholder ${className}`}>
      {imageUrl ? (
        <div className={`${sizeClasses[size]} rounded-full`}>
          <img src={imageUrl} alt={name || 'User'} />
        </div>
      ) : (
        <div className={`bg-neutral-focus text-neutral-content rounded-full ${sizeClasses[size]}`}>
          <span>{initials}</span>
        </div>
      )}
    </div>
  );
};

export default UserAvatar; 