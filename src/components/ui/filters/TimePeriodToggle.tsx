import React from 'react';

export type TimePeriod = 'day' | 'week' | 'month' | 'year';

interface TimePeriodToggleProps {
  value: TimePeriod;
  onChange: (value: TimePeriod) => void;
  className?: string;
}

const TimePeriodToggle: React.FC<TimePeriodToggleProps> = ({ 
  value, 
  onChange,
  className = ''
}) => {
  const options: { value: TimePeriod; label: string }[] = [
    { value: 'day', label: 'Día' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' }
  ];

  return (
    <div className={`flex rounded-lg overflow-hidden shadow-sm border border-gray-200 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          className={`px-3 py-1 text-sm font-medium ${
            value === option.value
              ? 'bg-primary text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default TimePeriodToggle; 