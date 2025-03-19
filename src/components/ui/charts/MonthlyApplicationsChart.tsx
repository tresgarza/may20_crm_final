import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Registrar componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MonthlyApplicationsChartProps {
  data: {
    month: string;
    count: number;
  }[];
  title?: string;
  height?: number;
  className?: string;
  color?: string;
}

const MonthlyApplicationsChart: React.FC<MonthlyApplicationsChartProps> = ({
  data,
  title = 'Solicitudes por Mes',
  height = 300,
  className = '',
  color = 'rgba(53, 162, 235, 0.7)',
}) => {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [
      {
        label: 'Solicitudes',
        data: [],
        borderColor: 'rgba(53, 162, 235, 0.8)',
        backgroundColor: 'rgba(53, 162, 235, 0.2)',
        fill: true,
        tension: 0.3,
      },
    ],
  });

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Ordenar los datos por mes
    const sortedData = [...data].sort((a, b) => a.month.localeCompare(b.month));

    // Formatear los meses para mostrar nombres en español
    const formattedMonths = sortedData.map((item) => {
      const [year, month] = item.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      
      // Nombre del mes en español
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      
      return `${monthNames[date.getMonth()]} ${year}`;
    });

    // Extraer los valores para el gráfico
    const counts = sortedData.map((item) => item.count);

    // Actualizar los datos del gráfico
    setChartData({
      labels: formattedMonths,
      datasets: [
        {
          label: 'Solicitudes',
          data: counts,
          borderColor: color,
          backgroundColor: color.replace('0.7', '0.1'),
          fill: true,
          tension: 0.3,
        },
      ],
    });
  }, [data, color]);

  const options = {
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
            return `Solicitudes: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className={`chart-container ${className}`} style={{ height: `${height}px` }}>
      {data && data.length > 0 ? (
        <Line data={chartData} options={options} />
      ) : (
        <div className="flex items-center justify-center h-full bg-base-200 rounded-lg">
          <p className="text-sm text-gray-500">Sin datos disponibles</p>
        </div>
      )}
    </div>
  );
};

export default MonthlyApplicationsChart; 