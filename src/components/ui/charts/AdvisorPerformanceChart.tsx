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

interface AdvisorData {
  advisor_name: string;
  total_applications: number;
  approved_applications?: number;
}

interface AdvisorPerformanceChartProps {
  data: AdvisorData[];
  title?: string;
  height?: number;
  className?: string;
  maxBars?: number;
}

const AdvisorPerformanceChart: React.FC<AdvisorPerformanceChartProps> = ({
  data,
  title = 'Rendimiento de Asesores',
  height = 350,
  className = '',
  maxBars = 10,
}) => {
  const [chartData, setChartData] = useState<any>({
    labels: [],
    datasets: [],
  });
  // Almacenar las etiquetas para acceder a ellas en las opciones del gráfico
  const [chartLabels, setChartLabels] = useState<string[]>([]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Ordenar los datos por total de aplicaciones (descendente)
    const sortedData = [...data].sort((a, b) => b.total_applications - a.total_applications);
    
    // Tomar solo los primeros maxBars elementos
    const limitedData = sortedData.slice(0, maxBars);
    
    const labels = limitedData.map(item => item.advisor_name);
    const totalApps = limitedData.map(item => item.total_applications);
    const approvedApps = limitedData.map(item => item.approved_applications || 0);

    // Guardar las etiquetas para usarlas en las opciones
    setChartLabels(labels);

    setChartData({
      labels,
      datasets: [
        {
          label: 'Total Solicitudes',
          data: totalApps,
          backgroundColor: 'rgba(53, 162, 235, 0.7)',
          borderColor: 'rgba(53, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Aprobadas',
          data: approvedApps,
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    });
  }, [data, maxBars]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
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
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}`;
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
        ticks: {
          callback: function(value: any, index: number) {
            // Acortar nombres largos
            const label = chartLabels[index];
            return label?.length > 12 ? label.substr(0, 10) + '...' : label;
          },
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

export default AdvisorPerformanceChart; 