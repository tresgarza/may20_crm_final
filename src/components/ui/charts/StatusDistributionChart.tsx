import React, { useEffect, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { STATUS_COLORS, STATUS_LABELS } from '../../../utils/constants/statuses';

// Registrar componentes necesarios de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface StatusDistributionChartProps {
  data: {
    status: string;
    count: number;
  }[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({
  data,
  title = 'Distribución por Estado',
  height = 240,
  showLegend = true,
  className = '',
}) => {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1,
      },
    ],
  });

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Agrupar estados similares
    const groupedData: Record<string, number> = {};
    
    data.forEach((item) => {
      // Normalizar el status para agrupar (pending, PENDING, Pendiente, etc.)
      let normalizedStatus = item.status.toLowerCase();
      
      if (normalizedStatus.includes('pend') || normalizedStatus === 'new' || normalizedStatus === 'solicitud' || normalizedStatus === 'simulación') {
        normalizedStatus = 'pending';
      } else if (normalizedStatus.includes('review') || normalizedStatus.includes('proceso')) {
        normalizedStatus = 'in_review';
      } else if (normalizedStatus.includes('apro')) {
        normalizedStatus = 'approved';
      } else if (normalizedStatus.includes('recha')) {
        normalizedStatus = 'rejected';
      } else if (normalizedStatus.includes('comple')) {
        normalizedStatus = 'completed';
      } else if (normalizedStatus.includes('cancel')) {
        normalizedStatus = 'cancelled';
      } else if (normalizedStatus.includes('disper')) {
        normalizedStatus = 'por_dispersar';
      }
      
      if (!groupedData[normalizedStatus]) {
        groupedData[normalizedStatus] = 0;
      }
      groupedData[normalizedStatus] += item.count;
    });
    
    // Crear arrays para el gráfico
    const statuses = Object.keys(groupedData);
    const counts = Object.values(groupedData);
    
    // Usar colores y etiquetas definidos en constantes
    const colors = statuses.map(status => {
      const colorKey = status.toUpperCase() as keyof typeof STATUS_COLORS;
      return STATUS_COLORS[colorKey] || '#cccccc';
    });
    
    const labels = statuses.map(status => {
      const labelKey = status.toUpperCase() as keyof typeof STATUS_LABELS;
      return STATUS_LABELS[labelKey] || status;
    });
    
    setChartData({
      labels,
      datasets: [
        {
          data: counts,
          backgroundColor: colors,
          borderColor: colors.map(color => color),
          borderWidth: 1,
        },
      ],
    });
  }, [data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          padding: 15,
          font: {
            size: 12,
          },
        },
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
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className={`chart-container ${className}`} style={{ height: `${height}px` }}>
      {data && data.length > 0 ? (
        <Pie data={chartData} options={options} />
      ) : (
        <div className="flex items-center justify-center h-full bg-base-200 rounded-lg">
          <p className="text-sm text-gray-500">Sin datos disponibles</p>
        </div>
      )}
    </div>
  );
};

export default StatusDistributionChart; 