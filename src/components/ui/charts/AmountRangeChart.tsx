import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AmountRange {
  range: string;
  count: number;
}

interface AmountRangeChartProps {
  data: AmountRange[];
  title?: string;
  height?: number;
  className?: string;
}

const AmountRangeChart: React.FC<AmountRangeChartProps> = ({
  data,
  title = 'Distribución por Monto',
  height = 300,
  className = '',
}) => {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [
      {
        label: 'Solicitudes',
        data: [],
        backgroundColor: 'rgba(255, 159, 64, 0.8)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      },
    ],
  });

  // Procesar los datos para el gráfico
  useEffect(() => {
    // First, validate that we have valid data
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('AmountRangeChart: No data or invalid data provided', data);
      return;
    }

    try {
      // Validate and normalize data (filter out invalid items)
      const validData = data.filter(item => 
        item && 
        typeof item === 'object' && 
        typeof item.range === 'string' && 
        item.range !== '' &&
        typeof item.count === 'number'
      );
      
      if (validData.length === 0) {
        console.log('AmountRangeChart: No valid data items found');
        return;
      }

      // Sort the ranges by value
      const sortedData = [...validData].sort((a, b) => {
        // Extract the minimum value of each range for sorting
        const getMinValue = (range: string) => {
          if (!range) return 0; // Handle undefined or null values
          try {
            const match = range.match(/(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          } catch (error) {
            console.error('Error parsing range:', range, error);
            return 0;
          }
        };
        
        return getMinValue(a.range) - getMinValue(b.range);
      });

      const labels = sortedData.map(item => item.range);
      const counts = sortedData.map(item => item.count);

      // Generate gradient colors based on the amount
      const colors = sortedData.map((_, index) => {
        const value = index / (sortedData.length - 1 || 1);
        const r = Math.round(255 - (value * 100));
        const g = Math.round(120 + (value * 60));
        const b = Math.round(50 + (value * 100));
        return `rgba(${r}, ${g}, ${b}, 0.8)`;
      });

      setChartData({
        labels,
        datasets: [
          {
            label: 'Solicitudes',
            data: counts,
            backgroundColor: colors,
            borderColor: colors.map(color => color.replace('0.8', '1')),
            borderWidth: 1,
          },
        ],
      });
    } catch (error) {
      console.error('Error processing chart data:', error);
    }
  }, [data]);

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `Solicitudes: ${context.parsed.x}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
      y: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className={`chart-container ${className}`} style={{ height: `${height}px` }}>
      {data && Array.isArray(data) && data.length > 0 ? (
        <Bar data={chartData} options={options} />
      ) : (
        <div className="flex items-center justify-center h-full bg-base-200 rounded-lg">
          <p className="text-sm text-gray-500">Sin datos disponibles</p>
        </div>
      )}
    </div>
  );
};

export default AmountRangeChart; 