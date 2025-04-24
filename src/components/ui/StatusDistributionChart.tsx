import * as React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface StatusCount {
  status: string;
  count: number;
}

interface StatusDistributionChartProps {
  data: StatusCount[];
}

// Define colors for each status
const STATUS_COLORS: {[key: string]: string} = {
  // Español
  'pendiente': '#f0ad4e', // amarillo/naranja para pendiente
  'revision': '#5bc0de', // azul claro para revisión
  'aprobado': '#5cb85c', // verde para aprobado
  'rechazado': '#d9534f', // rojo para rechazado
  'completado': '#337ab7', // azul para completado
  'cancelado': '#777777', // gris para cancelado
  'por_dispersar': '#9370DB', // violeta para por dispersar
  'dispersado': '#20B2AA', // turquesa para dispersado
  'simulación': '#F08080', // rosa claro para simulación
  'solicitud': '#FFD700', // dorado para solicitud
  
  // Versiones en inglés para compatibilidad
  'pending': '#f0ad4e',
  'review': '#5bc0de',
  'approved': '#5cb85c',
  'rejected': '#d9534f',
  'completed': '#337ab7',
  'cancelled': '#777777',
  'to_disperse': '#9370DB',
  'dispersed': '#20B2AA',
  'simulation': '#F08080',
  'request': '#FFD700',
  
  // Default color para estados desconocidos
  'default': '#6c757d'
};

const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500">No hay datos disponibles</div>;
  }

  // Get color for a status (case insensitive)
  const getColorForStatus = (status: string): string => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    return STATUS_COLORS[normalizedStatus] || STATUS_COLORS.default;
  };

  const chartData = {
    labels: data.map(item => item.status),
    datasets: [
      {
        label: 'Solicitudes',
        data: data.map(item => item.count),
        backgroundColor: data.map(item => getColorForStatus(item.status)),
        borderColor: data.map(item => getColorForStatus(item.status)),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = data.reduce((acc, curr) => acc + curr.count, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default StatusDistributionChart; 