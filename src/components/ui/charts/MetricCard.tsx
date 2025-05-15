import * as React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface MetricCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  formatValue?: (value: number | string) => string;
  icon?: React.ReactNode;
  color?: string;
  isPercentage?: boolean;
  isLoading?: boolean;
  className?: string;
  tooltip?: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  formatValue = (val) => val.toString(),
  icon,
  color = 'blue',
  isPercentage = false,
  isLoading = false,
  className = '',
  tooltip,
  onClick,
}) => {
  // Calcular la variación porcentual si hay un valor previo
  const calculateChange = () => {
    if (previousValue === undefined || typeof value !== 'number') return null;
    if (previousValue === 0) return value > 0 ? 100 : 0;
    return ((value - previousValue) / Math.abs(previousValue)) * 100;
  };

  const percentChange = calculateChange();
  const isPositiveChange = percentChange !== null && percentChange > 0;
  const isNegativeChange = percentChange !== null && percentChange < 0;

  // Mapeo de colores por nombre
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  // Seleccionar las clases de color
  const colorClasses = colorMap[color] || colorMap.blue;

  // Clases para el indicador de variación
  const changeClasses = isPositiveChange
    ? 'text-green-600 bg-green-50'
    : isNegativeChange
    ? 'text-red-600 bg-red-50'
    : 'text-gray-600 bg-gray-50';

  // Determine if the card should be clickable
  const isClickable = typeof onClick === 'function';

  return (
    <div 
      className={`border rounded-lg shadow-sm overflow-hidden ${className} ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600 group relative">
            {title}
            {tooltip && (
              <span className="hidden group-hover:block absolute bottom-full left-0 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                {tooltip}
              </span>
            )}
          </h3>
          {icon && <div className={`p-2 rounded-full ${colorClasses}`}>{icon}</div>}
        </div>

        {isLoading ? (
          <div className="animate-pulse h-8 bg-gray-200 rounded w-3/4 my-2"></div>
        ) : (
          <div className="flex items-end">
            <span className="text-2xl font-semibold">
              {formatValue(value)}
              {isPercentage && '%'}
            </span>

            {percentChange !== null && (
              <div className={`ml-2 px-2 py-0.5 rounded-md text-xs flex items-center ${changeClasses}`}>
                {isPositiveChange ? (
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                ) : isNegativeChange ? (
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                ) : null}
                {Math.abs(percentChange).toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard; 