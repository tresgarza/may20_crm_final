import * as React from 'react';
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
  preserveOriginalStatuses?: boolean;
}

// Definir colores específicos para cada estado
const STATUS_COLORS_MAP = {
  'Nuevo': '#FBBD23',     // amarillo para pendiente/nuevo (warning)
  'En Revisión': '#3ABFF8',   // azul claro para revisión (info)
  'Aprobado': '#36D399',    // verde claro para aprobado (success)
  'Por Dispersar': '#C084FC', // morado claro para dispersar (purple)
  'Rechazado': '#E11D48',    // rojo obscuro para rechazado (rose)
  'Completado': '#059669',   // verde obscuro para completado (emerald)
  'Cancelado': '#6E6E6E',   // gris para cancelado
  'Expirado': '#FF5757',     // rojo brillante para expirado
  'pending': '#FBBD23',         // compatibilidad con claves antiguas
  'in_review': '#3ABFF8',
  'approved': '#36D399',
  'rejected': '#E11D48',
  'completed': '#059669',
  'cancelled': '#6E6E6E',
  'por_dispersar': '#C084FC',
  'expired': '#FF5757',
  'default': '#cccccc'      // gris claro para desconocidos
};

// Definir etiquetas en español
const STATUS_LABELS_MAP = {
  'pending': 'Nuevo',
  'in_review': 'En Revisión',
  'approved': 'Aprobado',
  'rejected': 'Rechazado',
  'completed': 'Completado',
  'cancelled': 'Cancelado',
  'por_dispersar': 'Por Dispersar',
  'expired': 'Expirado',
  'new': 'Nuevo',
  'solicitud': 'Nuevo',
  'default': 'Desconocido'
};

const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({
  data,
  title = 'Distribución por Estado',
  height = 240,
  showLegend = true,
  className = '',
  preserveOriginalStatuses = false,
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
    
    if (lowerStatus.includes('pend') || lowerStatus === 'new' || lowerStatus === 'solicitud' || lowerStatus === 'nuevo') {
      return 'Nuevo';
    } else if (lowerStatus.includes('review') || lowerStatus.includes('revis')) {
      return 'En Revisión';
    } else if (lowerStatus.includes('aprob') || lowerStatus.includes('aprov') || lowerStatus.includes('approv')) {
      return 'Aprobado';
    } else if (lowerStatus.includes('recha') || lowerStatus.includes('reject')) {
      return 'Rechazado';
    } else if (lowerStatus.includes('comple')) {
      return 'Completado';
    } else if (lowerStatus.includes('cancel')) {
      return 'Cancelado';
    } else if (lowerStatus.includes('dispers')) {
      return 'Por Dispersar';
    } else if (lowerStatus.includes('expir')) {
      return 'Expirado';
    } else {
      return 'default';
    }
  };

  // Agrupar datos por estado normalizado o mantener originales
  const groupedData: Record<string, number> = {};
  
  if (preserveOriginalStatuses) {
    // Usar los estados originales sin normalizar
    data.forEach(item => {
      // Convertir a minúsculas para estandarizar
      const originalStatus = item.status.toLowerCase();
      if (!groupedData[originalStatus]) {
        groupedData[originalStatus] = 0;
      }
      groupedData[originalStatus] += item.count;
    });
  } else {
    // Normalizar estados (comportamiento original)
    data.forEach(item => {
      const normalizedStatus = normalizeStatus(item.status);
      if (!groupedData[normalizedStatus]) {
        groupedData[normalizedStatus] = 0;
      }
      groupedData[normalizedStatus] += item.count;
    });
  }

  // Preparar datos para el gráfico
  const statuses = Object.keys(groupedData);
  const counts = Object.values(groupedData);
  
  // Obtener colores y etiquetas
  const colors = statuses.map(status => {
    // Si preservamos estados originales, podemos intentar encontrar un color adecuado
    if (preserveOriginalStatuses) {
      // Intentar encontrar un color basado en palabras clave
      const statusLower = status.toLowerCase();
      if (statusLower.includes('pend') || statusLower === 'new' || statusLower === 'solicitud' || statusLower === 'nuevo') {
        return STATUS_COLORS_MAP.pending; // Amarillo
      } else if (statusLower.includes('review') || statusLower.includes('revis')) {
        return STATUS_COLORS_MAP.in_review; // Azul claro
      } else if (statusLower.includes('aprob') || statusLower.includes('aprov') || statusLower === 'aprobado' || statusLower.includes('approv')) {
        return STATUS_COLORS_MAP.approved; // Verde claro
      } else if (statusLower.includes('comple')) {
        return STATUS_COLORS_MAP.completed; // Verde obscuro
      } else if (statusLower.includes('disper')) {
        return STATUS_COLORS_MAP.por_dispersar; // Morado claro
      } else if (statusLower.includes('recha') || statusLower.includes('reject')) {
        return STATUS_COLORS_MAP.rejected; // Rojo obscuro
      } else if (statusLower.includes('cancel')) {
        return STATUS_COLORS_MAP.cancelled;
      } else if (statusLower.includes('expir')) {
        return STATUS_COLORS_MAP.expired;
      } else {
        return STATUS_COLORS_MAP.default;
      }
    }
    // Si no preservamos, usar el mapa de colores directamente
    return STATUS_COLORS_MAP[status as keyof typeof STATUS_COLORS_MAP] || STATUS_COLORS_MAP.default;
  });
  
  // Obtener etiquetas con la primera letra mayúscula si no hay un mapeo directo
  const labels = statuses.map(status => {
    if (preserveOriginalStatuses) {
      // Buscar el estado en el mapa de etiquetas
      const mappedLabel = STATUS_LABELS_MAP[status as keyof typeof STATUS_LABELS_MAP];
      if (mappedLabel) {
        return mappedLabel;
      }
      // Capitalizar la primera letra si no hay mapeo
      return status.charAt(0).toUpperCase() + status.slice(1);
    }
    return STATUS_LABELS_MAP[status as keyof typeof STATUS_LABELS_MAP] || status;
  });

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