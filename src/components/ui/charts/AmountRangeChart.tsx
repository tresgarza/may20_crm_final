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
    if (!data || data.length === 0) return;

    // Ordenar los rangos por valor
    const sortedData = [...data].sort((a, b) => {
      // Extraer el valor mínimo de cada rango para ordenar
      const getMinValue = (range: string) => {
        const match = range.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      
      return getMinValue(a.range) - getMinValue(b.range);
    });

    const labels = sortedData.map(item => item.range);
    const counts = sortedData.map(item => item.count);

    // Generar colores con gradiente según el monto
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
      {data && data.length > 0 ? (
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