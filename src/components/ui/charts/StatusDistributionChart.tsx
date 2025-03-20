import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { APPLICATION_STATUS } from '../../../utils/constants/statuses';

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

// Definir colores específicos para cada estado
const STATUS_COLORS_MAP = {
  'pending': '#FBBD23',     // amarillo para pendiente
  'in_review': '#D926AA',   // magenta para revisión
  'approved': '#36D399',    // verde para aprobado
  'rejected': '#F87272',    // rojo para rechazado
  'completed': '#570DF8',   // azul para completado
  'cancelled': '#6E6E6E',   // gris para cancelado
  'por_dispersar': '#62A0EA', // celeste para dispersar
  'expired': '#FF5757',     // rojo brillante para expirado
  'new': '#3ABFF8',         // azul claro para nuevo
  'default': '#cccccc'      // gris claro para desconocidos
};

// Definir etiquetas en español
const STATUS_LABELS_MAP = {
  'pending': 'Pendiente',
  'in_review': 'En Revisión',
  'approved': 'Aprobado',
  'rejected': 'Rechazado',
  'completed': 'Completado',
  'cancelled': 'Cancelado',
  'por_dispersar': 'Por Dispersar',
  'expired': 'Expirado',
  'new': 'Nuevo',
  'solicitud': 'Pendiente',
  'default': 'Desconocido'
};

const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({
  data,
  title = 'Distribución por Estado',
  height = 240,
  showLegend = true,
  className = '',
}) => {
  // Si no hay datos, mostrar mensaje
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-base-200 rounded-lg">
        <p className="text-sm text-gray-500">Sin datos disponibles</p>
      </div>
    );
  }

  // Normalizar estados y agrupar por categoría
  const normalizeStatus = (status: string): string => {
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus.includes('pend') || lowerStatus === 'new' || lowerStatus === 'solicitud') {
      return 'pending';
    } else if (lowerStatus.includes('review') || lowerStatus.includes('revis')) {
      return 'in_review';
    } else if (lowerStatus.includes('aprob') || lowerStatus.includes('aprov')) {
      return 'approved';
    } else if (lowerStatus.includes('recha') || lowerStatus.includes('reject')) {
      return 'rejected';
    } else if (lowerStatus.includes('comple')) {
      return 'completed';
    } else if (lowerStatus.includes('cancel')) {
      return 'cancelled';
    } else if (lowerStatus.includes('disper')) {
      return 'por_dispersar';
    } else if (lowerStatus.includes('expir')) {
      return 'expired';
    } else {
      return 'default';
    }
  };

  // Agrupar datos por estado normalizado
  const groupedData: Record<string, number> = {};
  data.forEach(item => {
    const normalizedStatus = normalizeStatus(item.status);
    if (!groupedData[normalizedStatus]) {
      groupedData[normalizedStatus] = 0;
    }
    groupedData[normalizedStatus] += item.count;
  });

  // Preparar datos para el gráfico
  const statuses = Object.keys(groupedData);
  const counts = Object.values(groupedData);
  const colors = statuses.map(status => STATUS_COLORS_MAP[status as keyof typeof STATUS_COLORS_MAP] || STATUS_COLORS_MAP.default);
  const labels = statuses.map(status => STATUS_LABELS_MAP[status as keyof typeof STATUS_LABELS_MAP] || status);

  // Datos del gráfico
  const chartData = {
    labels,
    datasets: [
      {
        data: counts,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 1,
      },
    ],
  };

  // Opciones del gráfico
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
            const total = counts.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className={`chart-container ${className}`} style={{ height: `${height}px` }}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default StatusDistributionChart; 