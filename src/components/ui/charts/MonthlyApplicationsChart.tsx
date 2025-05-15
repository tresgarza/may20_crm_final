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
import { TimePeriod } from '../filters/TimePeriodToggle';

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
    // Add raw data with actual dates
    applications?: Array<{
      date: string;
      count: number;
    }>;
  }[];
  title?: string;
  height?: number;
  className?: string;
  color?: string;
  timePeriod?: TimePeriod;
}

const MonthlyApplicationsChart: React.FC<MonthlyApplicationsChartProps> = ({
  data,
  title = 'Solicitudes por Mes',
  height = 300,
  className = '',
  color = 'rgba(53, 162, 235, 0.7)',
  timePeriod = 'month',
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

    // Procesamos los datos según el período de tiempo seleccionado
    let processedData: { label: string; count: number }[] = [];
    
    switch (timePeriod) {
      case 'day':
        // Agrupar por día (último día hasta 30 días atrás)
        processedData = processDataByDay(sortedData);
        break;
      case 'week':
        // Agrupar por semana (último mes, por semana)
        processedData = processDataByWeek(sortedData);
        break;
      case 'year':
        // Agrupar por año
        processedData = processDataByYear(sortedData);
        break;
      case 'month':
      default:
    // Formatear los meses para mostrar nombres en español
        processedData = sortedData.map((item) => {
      const [year, month] = item.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      
      // Nombre del mes en español
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      
          return {
            label: `${monthNames[date.getMonth()]} ${year}`,
            count: item.count
          };
    });
        break;
    }

    // Extraer las etiquetas y valores para el gráfico
    const labels = processedData.map(item => item.label);
    const counts = processedData.map(item => item.count);

    // Actualizar los datos del gráfico
    setChartData({
      labels: labels,
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
  }, [data, color, timePeriod]);

  // Función para procesar datos por día
  const processDataByDay = (sortedData: { month: string; count: number; daily?: Array<{date: string; count: number}> }[]) => {
    // Obtener fecha actual y fecha hace 30 días
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    // Crear mapa para agrupar por día exacto (YYYY-MM-DD)
    const dailyData: Record<string, number> = {};
    
    // Inicializar el mapa con los últimos 30 días (todos en 0)
    for (let i = 0; i < 30; i++) {
      const day = new Date();
      day.setDate(now.getDate() - i);
      const dayKey = day.toISOString().split('T')[0]; // formato YYYY-MM-DD
      dailyData[dayKey] = 0;
    }
    
    // Procesar la información diaria si está disponible
    sortedData.forEach(monthItem => {
      if (monthItem.daily && Array.isArray(monthItem.daily)) {
        // Usar datos diarios de la API cuando estén disponibles
        monthItem.daily.forEach(dayData => {
          const dayDate = new Date(dayData.date);
          // Solo incluir si está dentro de los últimos 30 días
          if (dayDate >= thirtyDaysAgo && dayDate <= now) {
            dailyData[dayData.date] = dayData.count;
          }
        });
      } else {
        // Fallback al método anterior si no hay datos diarios
        const [year, month] = monthItem.month.split('-');
        const currentDate = new Date().toISOString().split('T')[0];
        const currentMonth = currentDate.substring(0, 7); // YYYY-MM
        
        // Si es el mes actual, usar el recuento para hoy o distribuir
        if (`${year}-${month}` === currentMonth) {
          // Para el mes actual, asignar todo al día de hoy
          const today = new Date().toISOString().split('T')[0];
          dailyData[today] = monthItem.count;
        }
      }
    });
    
    // Convertir el mapa a array y ordenar
    return Object.entries(dailyData)
      .map(([date, count]) => {
        const displayDate = new Date(date);
        const day = displayDate.getDate().toString().padStart(2, '0');
        const month = displayDate.toLocaleString('es-ES', { month: 'short' });
        return {
          label: `${day} ${month}`,
          count,
          date
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      // Limitar a los últimos 30 días
      .slice(-30);
  };

  // Función para procesar datos por semana
  const processDataByWeek = (sortedData: { month: string; count: number; daily?: Array<{date: string; count: number}> }[]) => {
    const now = new Date();
    const weeks: { label: string; count: number; startDate: string; endDate: string }[] = [];
    
    // Crear un arreglo de las últimas 5 semanas
    for (let i = 0; i < 5; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (i * 7));
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      
      const formatDate = (date: Date) => {
        return `${date.getDate()} ${date.toLocaleString('es-ES', { month: 'short' })}`;
      };
      
      const weekStartISO = weekStart.toISOString().split('T')[0];
      const weekEndISO = weekEnd.toISOString().split('T')[0];
      
      weeks.unshift({
        label: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
        count: 0,
        startDate: weekStartISO,
        endDate: weekEndISO
      });
    }
    
    // Recolectar todos los datos diarios disponibles
    const allDailyData: Record<string, number> = {};
    
    sortedData.forEach(monthItem => {
      if (monthItem.daily && Array.isArray(monthItem.daily)) {
        // Usar datos diarios detallados cuando estén disponibles
        monthItem.daily.forEach(dayData => {
          allDailyData[dayData.date] = dayData.count;
        });
      } else {
        // Si no hay datos diarios, usar la información mensual para el mes actual
        const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
        if (monthItem.month === currentMonth) {
          // Distribuir al día de hoy
          const today = new Date().toISOString().split('T')[0];
          allDailyData[today] = monthItem.count;
        }
      }
    });
    
    // Distribuir conteos diarios a las semanas correspondientes
    Object.entries(allDailyData).forEach(([date, count]) => {
      // Encontrar la semana a la que pertenece esta fecha
      const week = weeks.find(w => date >= w.startDate && date <= w.endDate);
      if (week) {
        week.count += count;
      }
    });
    
    return weeks;
  };

  // Función para procesar datos por año
  const processDataByYear = (sortedData: { month: string; count: number }[]) => {
    // Agrupar por año
    const yearCount: Record<string, number> = {};
    
    sortedData.forEach(item => {
      const [year] = item.month.split('-');
      yearCount[year] = (yearCount[year] || 0) + item.count;
    });
    
    // Ordenar por año
    return Object.entries(yearCount)
      .map(([year, count]) => ({ label: year, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

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