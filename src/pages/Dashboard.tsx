import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartBarIcon, CurrencyDollarIcon, UserGroupIcon, ClipboardDocumentCheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { USER_ROLES } from '../utils/constants/roles';
import { APPLICATION_TYPE_LABELS } from '../utils/constants/applications';
import { DashboardStats, ApplicationStats, CompanyStats } from '../types/dashboard.types';
import { formatCurrency, formatDate } from '../utils/formatters';

// Componentes de UI
import MainLayout from '../components/layout/MainLayout';
import MetricCard from '../components/ui/charts/MetricCard';
import StatusDistributionChart from '../components/ui/charts/StatusDistributionChart';
import MonthlyApplicationsChart from '../components/ui/charts/MonthlyApplicationsChart';
import AmountRangeChart from '../components/ui/charts/AmountRangeChart';
import AdvisorPerformanceChart from '../components/ui/charts/AdvisorPerformanceChart';
import DateRangeFilter, { DateRange, DateRangeOption } from '../components/ui/filters/DateRangeFilter';
import TimePeriodToggle, { TimePeriod } from '../components/ui/filters/TimePeriodToggle';

// Servicios
import {
  getGeneralDashboardStats,
  getAdvisorStats,
  getCompanyDashboardStats,
  getPendingApprovals
} from '../services/dashboardService';

// Interfaces adicionales
interface AmountRange {
  range: string;
  count: number;
}

interface AdvisorData {
  advisor_name: string;
  total_applications: number;
  approved_applications?: number;
}

// Extender las interfaces para agregar propiedades opcionales para el dashboard
interface ExtendedStats {
  applications?: { [key: string]: number };
  previousMonthApproved?: number;
  amountRanges?: AmountRange[];
  mockAdvisorPerformance?: AdvisorData[];
  totalClients?: number;
  totalCompanies?: number;
  totalAdvisors?: number;
  conversionRate?: number;
  pendingApproval?: number;
  avgTimeToApproval?: number;
  avgApprovalTime?: number;
  totalPending?: number;
  totalApproved?: number;
  totalRejected?: number;
  attentionNeededCount?: number;
  // Add any other extra fields needed
}

// Tipo combinado para stats con todas las propiedades posibles
type DashboardStatsType = (DashboardStats | ApplicationStats | CompanyStats) & Partial<ExtendedStats>;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStatsType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [partialData, setPartialData] = useState(false);
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>('all');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    advisorId: '',
    companyId: '',
  });
  const [pendingApproval, setPendingApproval] = useState(0);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');

  // Create a wrapper for formatCurrency that matches MetricCard's formatValue type
  const formatMetricValue = (value: string | number): string => {
    if (typeof value === 'string') {
      return formatCurrency(parseFloat(value) || 0);
    }
    return formatCurrency(value || 0);
  };

  // Comprobar si el objeto es de tipo ApplicationStats
  const isAdvisorStats = (obj: any): obj is ApplicationStats => {
    console.log('Checking if stats is AdvisorStats');
    return obj && 
           'advisorId' in obj && 
           typeof obj.advisorId === 'string' && 
           'conversionRate' in obj;
  };

  // Comprobar si el objeto es de tipo CompanyStats
  const isCompanyStats = (obj: any): obj is CompanyStats => {
    console.log('Checking if stats is CompanyStats');
    return obj && 
           'companyId' in obj && 
           typeof obj.companyId === 'string' &&
           'totalAdvisors' in obj && 
           'avgApprovalTime' in obj;
  };

  // Define the fallback functions before they're used in useEffect
  // Crear datos de respaldo para estadísticas generales
  const createFallbackGeneralStats = (): DashboardStats => {
    return {
      totalApplications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
      totalAmount: 0,
      avgAmount: 0,
      recentApplications: [],
      applicationsByStatus: [],
      applicationsByMonth: [],
      applicationsByStatusChart: [],
      totalClients: 0,
      attentionNeededCount: 0
    };
  };

  // Crear datos de respaldo para estadísticas de asesor
  const createFallbackAdvisorStats = (advisorId: string): ApplicationStats => {
    return {
      applicationId: '',
      advisorId: advisorId,
      totalApplications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
      totalAmount: 0,
      avgAmount: 0,
      recentApplications: [],
      applicationsByMonth: [],
      applicationsByStatus: [],
      applicationsByStatusChart: [],
      totalClients: 0,
      conversionRate: 0,
      attentionNeededCount: 0
    };
  };

  // Crear datos de respaldo para estadísticas de empresa
  const createFallbackCompanyStats = (companyId: string): CompanyStats => {
    return {
      companyId: companyId,
      totalApplications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
      totalAmount: 0,
      avgAmount: 0,
      recentApplications: [],
      totalClients: 0,
      totalAdvisors: 0,
      avgApprovalTime: 0,
      applicationsByStatus: [],
      applicationsByStatusChart: [],
      applicationsByMonth: [],
      advisorPerformance: [],
      attentionNeededCount: 0
    };
  };

  // Función para cargar estadísticas basadas en el rol
  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Loading dashboard stats...');
      console.log('Current user:', user);

      if (!user) {
        console.log('No user found, returning early');
        setIsLoading(false);
        return;
      }

      let dashboardStats: DashboardStatsType | null = null;

      // Definir filtros para la consulta
      const queryFilters = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        advisorId: filters.advisorId || undefined,
        companyId: filters.companyId || undefined,
      };
      
      // Ensure entity filtering is always applied correctly based on user role
      if (user.role === USER_ROLES.ADVISOR) {
        // For advisors, always filter by their ID
        queryFilters.advisorId = user.id;
        console.log('Applied advisor filter for advisor role:', user.id);
      } else if (user.role === USER_ROLES.COMPANY_ADMIN) {
        // For company admins, always filter by their company ID
        if (!user.entityId) {
          console.error('Company admin user has no entityId (company_id)');
          setError('Error: Administrador de empresa sin ID de empresa');
          setIsLoading(false);
          return;
        }
        queryFilters.companyId = user.entityId;
        console.log('Applied company filter for company admin role:', user.entityId);
      }
      
      console.log('Using query filters:', queryFilters);

      if (user.role === USER_ROLES.SUPERADMIN) {
        console.log('Loading stats for SUPERADMIN');
        dashboardStats = await getGeneralDashboardStats(queryFilters);
      } else if (user.role === USER_ROLES.ADVISOR) {
        console.log('Loading stats for ADVISOR with ID:', user.id);
        if (!user.id) {
          console.error('Advisor user has no ID');
          setError('Error: Asesor sin ID');
          setIsLoading(false);
          return;
        }
        dashboardStats = await getAdvisorStats(user.id, queryFilters);
        console.log('ADVISOR stats loaded:', {
          totalApplications: dashboardStats?.totalApplications,
          approvedApplications: dashboardStats?.approvedApplications,
          applicationsByStatus: dashboardStats?.applicationsByStatus
        });
      } else if (user.role === USER_ROLES.COMPANY_ADMIN) {
        console.log('Loading stats for COMPANY_ADMIN with entity ID:', user.entityId);
        if (!user.entityId) {
          console.error('Company admin user has no entityId (company_id) - already checked above');
          setIsLoading(false);
          return;
        }
        dashboardStats = await getCompanyDashboardStats(user.entityId, queryFilters);
        console.log('COMPANY_ADMIN stats loaded:', {
          totalApplications: dashboardStats?.totalApplications,
          approvedApplications: dashboardStats?.approvedApplications,
          applicationsByStatus: dashboardStats?.applicationsByStatus
        });
      }

      console.log('Received dashboard stats:', dashboardStats);
      
      if (dashboardStats && 'applicationsByStatus' in dashboardStats) {
        console.log('Applications by status:', dashboardStats.applicationsByStatus);
      }
      
      if (dashboardStats && 'applicationsByMonth' in dashboardStats) {
        console.log('Applications by month:', dashboardStats.applicationsByMonth);
      }

      // Validar que los números coincidan - comprobación adicional
      if (dashboardStats) {
        console.log('Verification - Dashboard total stats:', {
          totalApplications: dashboardStats.totalApplications,
          byStatus: dashboardStats.applicationsByStatus 
            ? Array.isArray(dashboardStats.applicationsByStatus) 
              ? dashboardStats.applicationsByStatus.reduce((sum, item) => sum + item.count, 0) 
              : Object.values(dashboardStats.applicationsByStatus).reduce((sum: number, count) => sum + (count as number), 0)
            : 0
        });
      }

      // Obtener información de aprobaciones pendientes
      try {
        const isPendingApprovals = user.role === USER_ROLES.ADVISOR || user.role === USER_ROLES.COMPANY_ADMIN;
        
        if (isPendingApprovals && user.id) {
          console.log('Fetching pending approvals for user:', user.id, 'isCompanyAdmin:', user.role === USER_ROLES.COMPANY_ADMIN);
          const pendingData = await getPendingApprovals(
            user.role === USER_ROLES.COMPANY_ADMIN ? (user.entityId || user.id) : user.id,
            user.role === USER_ROLES.COMPANY_ADMIN
          );
          
          console.log('Pending approvals data:', pendingData);
          setPendingApproval(pendingData.totalPending);
        }
      } catch (approvalError) {
        console.error('Error fetching pending approvals:', approvalError);
      }

      setStats(dashboardStats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setError('Error al cargar las estadísticas del dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    loadStats();
    console.log('Refreshing stats with dateRangeOption:', dateRangeOption);
  }, [user, filters, loadStats, dateRangeOption]);

  // Agregar useEffect para detectar cuando la página está visible
  useEffect(() => {
    // Esta función se ejecutará cada vez que el componente reciba el foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Dashboard visible, recargando estadísticas...');
        loadStats();
      }
    };

    // Agregar listener para detectar cambios de visibilidad
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling cada 120 segundos para mantener el dashboard actualizado
    const intervalId = setInterval(() => {
      console.log('Refresco periódico del dashboard...');
      loadStats();
    }, 120000); // Cambiado de 30000 (30 segundos) a 120000 (120 segundos)

    // Limpiar listeners y intervalos al desmontar
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [loadStats]);

  // Manejadores para los filtros
  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  // Manejador para el cambio en el filtro de fechas
  const handleDateRangeChange = (range: DateRange) => {
    console.log('Date range changed:', range);
    console.log('Current user role:', user?.role);
    
    // Convertir fechas a strings solo si las fechas existen
    const startDateStr = range.startDate ? range.startDate.toISOString().split('T')[0] : '';
    const endDateStr = range.endDate ? range.endDate.toISOString().split('T')[0] : '';
    
    console.log('Converting to date strings:', { 
      startDate: startDateStr, 
      endDate: endDateStr,
      currentStartDate: filters.startDate,
      currentEndDate: filters.endDate
    });
    
    // Determinar la opción de fecha seleccionada primero
    let newDateRangeOption: DateRangeOption = 'all';
    
    if (!range.startDate && !range.endDate) {
      console.log('Setting date option to "all"');
      newDateRangeOption = 'all';
    } else if (range.startDate && range.endDate) {
      // Comprueba si es una opción predefinida o rango personalizado
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      // Obtener el primer día de la semana (lunes)
      const currentDay = today.getDay();
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const weekStart = new Date(today);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      // Obtener el primer y último día del mes
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      
      // Obtener el primer y último día del año
      const yearStart = new Date(today.getFullYear(), 0, 1);
      const yearEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
      
      // Comparar fechas para determinar la opción
      const startTime = range.startDate.getTime();
      const endTime = range.endDate.getTime();
      
      console.log('Date comparisons:', {
        startTime,
        endTime,
        todayStart: todayStart.getTime(),
        todayEnd: todayEnd.getTime(),
        weekStart: weekStart.getTime(),
        weekEnd: weekEnd.getTime(),
        monthStart: monthStart.getTime(),
        monthEnd: monthEnd.getTime(),
        yearStart: yearStart.getTime(),
        yearEnd: yearEnd.getTime()
      });
      
      if (startTime === todayStart.getTime() && endTime === todayEnd.getTime()) {
        console.log('Setting date option to "today"');
        newDateRangeOption = 'today';
      } else if (startTime === weekStart.getTime() && endTime === weekEnd.getTime()) {
        console.log('Setting date option to "thisWeek"');
        newDateRangeOption = 'thisWeek';
      } else if (startTime === monthStart.getTime() && endTime === monthEnd.getTime()) {
        console.log('Setting date option to "thisMonth"');
        newDateRangeOption = 'thisMonth';
      } else if (startTime === yearStart.getTime() && endTime === yearEnd.getTime()) {
        console.log('Setting date option to "thisYear"');
        newDateRangeOption = 'thisYear';
      } else {
        console.log('Setting date option to "custom"');
        newDateRangeOption = 'custom';
      }
    }
    
    // Actualizar la opción de fecha seleccionada
    console.log('Updating dateRangeOption from', dateRangeOption, 'to', newDateRangeOption);
    setDateRangeOption(newDateRangeOption);
    
    // Solo actualizar si las fechas son diferentes a las actuales
    // para evitar ciclos de renderizado infinitos
    if (startDateStr !== filters.startDate || endDateStr !== filters.endDate) {
      console.log('Date range differs from current filters, updating...');
      
      setFilters(prev => ({
        ...prev,
        startDate: startDateStr,
        endDate: endDateStr
      }));
    } else {
      console.log('Date range is the same as current filters, but still updating dateRangeOption');
    }
  };

  // Utility function to get application type label
  const getApplicationTypeLabel = (type: string): string => {
    return APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS] || type;
  };

  // Check if stats has the amountRanges and mockAdvisorPerformance properties
  const hasExtendedData = (stats: any): stats is DashboardStatsType & { amountRanges: AmountRange[], mockAdvisorPerformance: AdvisorData[] } => {
    return stats && 
           typeof stats === 'object' && 
           'amountRanges' in stats && 
           Array.isArray(stats.amountRanges) && 
           stats.amountRanges.length > 0 &&
           'mockAdvisorPerformance' in stats;
  };

  // Add debug logging for dashboard rendering
  useEffect(() => {
    if (stats) {
      console.log('Dashboard rendering with stats:', {
        totalApplications: stats.totalApplications,
        pendingApplications: stats.pendingApplications,
        approvedApplications: stats.approvedApplications,
        rejectedApplications: stats.rejectedApplications,
        applicationsByStatus: stats.applicationsByStatus,
        applicationsByStatusType: Array.isArray(stats.applicationsByStatus) ? 'array' : typeof stats.applicationsByStatus
      });
    }
  }, [stats]);

  // Utility to check if applicationsByStatus is in array format (CompanyStats)
  // or object format (ApplicationStats/DashboardStats)
  const isApplicationStatusArray = (data: any): data is Array<{status: string; count: number}> => {
    return Array.isArray(data) && data.length > 0 && 'status' in data[0] && 'count' in data[0];
  };
  
  const formatStatusData = (statusData: any): Array<{status: string; count: number}> => {
    if (isApplicationStatusArray(statusData)) {
      return statusData;
    } else if (statusData && typeof statusData === 'object' && !Array.isArray(statusData)) {
      return Object.entries(statusData).map(([status, count]) => ({
        status,
        count: typeof count === 'number' ? count : 0
      }));
    }
    return [];
  };

  // Function to navigate to KanbanBoard with needs attention filter
  const navigateToAttentionNeededApplications = () => {
    // Navigate to the Kanban board with a query parameter to indicate we want to filter for attention needed applications
    navigate('/applications/kanban?filter=attention_needed');
  };

  // Si está cargando, mostrar indicador
  if (isLoading) {
    console.log('Dashboard is in loading state');
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-full p-8">
          <div className="spinner-border text-primary" role="status">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Si hay error, mostrar mensaje
  if (error) {
    console.log('Dashboard has error:', error);
    return (
      <MainLayout>
        <div className="p-8">
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Si no hay datos, mostrar mensaje
  if (!stats) {
    console.log('Dashboard has no stats data');
    return (
      <MainLayout>
        <div className="p-8">
          <div className="alert alert-info">
            <span>No hay datos disponibles para mostrar en el dashboard.</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Si es asesor, mostrar sus métricas específicas
  if (isAdvisorStats(stats)) {
    console.log('Rendering advisor dashboard with data:', {
      totalApplications: stats.totalApplications,
      approvedApplications: stats.approvedApplications,
      applicationsByStatus: stats.applicationsByStatus
    });
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
          <div className="badge badge-primary ml-3 mb-6">Solo Planes Seleccionados</div>
          </div>
          
          {/* Filtro de rango de fechas */}
          <div className="mb-6 w-full sm:w-auto">
            <DateRangeFilter 
              onChange={handleDateRangeChange}
              initialOption={dateRangeOption}
            />
          </div>
        </div>

        {partialData && (
          <div className="alert alert-warning mb-4">
            <span>Algunos datos no pudieron cargarse completamente. Se muestran datos parciales o de ejemplo.</span>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* Tarjetas de métricas principales - Always show regardless of value */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <MetricCard
            title="Total de Solicitudes"
            value={stats?.totalApplications || 0}
            icon={<ChartBarIcon className="h-5 w-5" />}
            color="blue"
          />
          <MetricCard
            title="Solicitudes Aprobadas"
            value={stats?.approvedApplications || 0}
            previousValue={0}
            icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />}
            color="green"
          />
          <MetricCard
            title="Monto Aprobado Promedio"
            value={stats?.avgAmount || 0}
            formatValue={formatMetricValue}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
            color="indigo"
          />
          {isAdvisorStats(stats) ? (
            <MetricCard
              title="Tasa de Conversión"
              value={Number(stats?.conversionRate || 0)}
              isPercentage={true}
              icon={<UserGroupIcon className="h-5 w-5" />}
              color="purple"
            />
          ) : (
            <MetricCard
              title="Total de Empleados"
              value={Number(stats?.totalClients || 0)}
              icon={<UserGroupIcon className="h-5 w-5" />}
              color="purple"
            />
          )}
          
          <MetricCard
            title="Requieren Atención"
            value={stats?.attentionNeededCount || 0}
            icon={<ExclamationCircleIcon className="h-5 w-5" />}
            color="red"
            tooltip="Solicitudes sin cambios en 48+ horas (no rechazadas ni completadas)"
            onClick={navigateToAttentionNeededApplications}
          />
        </div>

        {/* Gráficos principales - Always show regardless of data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title text-lg font-semibold">
                  {timePeriod === 'day' && 'Solicitudes por Día'}
                  {timePeriod === 'week' && 'Solicitudes por Semana'}
                  {timePeriod === 'month' && 'Solicitudes por Mes'}
                  {timePeriod === 'year' && 'Solicitudes por Año'}
                </h2>
                <TimePeriodToggle
                  value={timePeriod}
                  onChange={setTimePeriod}
                  className="ml-auto"
                />
              </div>
              {stats.applicationsByMonth && (
                <MonthlyApplicationsChart
                  data={Array.isArray(stats.applicationsByMonth) ? stats.applicationsByMonth.map((item: any) => ({
                    month: String(item.month || ''),
                    count: Number(item.count || 0),
                    daily: Array.isArray(item.daily) ? item.daily : undefined
                  })) : []}
                  height={300}
                  title=""
                  timePeriod={timePeriod}
                />
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-lg font-semibold">Distribución por Estado</h2>
              <StatusDistributionChart
                data={isAdvisorStats(stats) && stats.applicationsByStatusChart 
                  ? stats.applicationsByStatusChart
                  : formatStatusData(stats.applicationsByStatus)}
                height={300}
                title=""
                preserveOriginalStatuses={true}
              />
            </div>
          </div>
        </div>

        {/* Gráficos secundarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-lg font-semibold">Distribución por Monto</h2>
              {(() => {
                // Logs fuera del JSX para evitar errores de 'void not assignable to ReactNode'
                console.log('Dashboard - amountRanges:', stats?.amountRanges);
                console.log('Dashboard - amountRanges type:', Array.isArray(stats?.amountRanges) ? 'Array' : typeof stats?.amountRanges);
                console.log('Dashboard - amountRanges conditions:', {
                  exists: !!stats?.amountRanges,
                  isArray: Array.isArray(stats?.amountRanges),
                  length: stats?.amountRanges?.length,
                  validLength: (stats?.amountRanges?.length || 0) > 0,
                  userRole: user?.role
                });
                return null;
              })()}
              {stats && stats.amountRanges && Array.isArray(stats.amountRanges) && stats.amountRanges.length > 0 ? (
                <AmountRangeChart
                  data={stats.amountRanges}
                  height={300}
                  title=""
                />
              ) : (
                <div className="flex items-center justify-center h-[300px] bg-base-200 rounded-lg">
                  <p className="text-sm text-gray-500">Sin datos disponibles</p>
                </div>
              )}
            </div>
          </div>

          {/* Rendimiento de asesores (solo para superadmin) */}
          {user?.role === USER_ROLES.SUPERADMIN && (
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h2 className="card-title text-lg font-semibold">Rendimiento de Asesores</h2>
                {hasExtendedData(stats) && stats.mockAdvisorPerformance && stats.mockAdvisorPerformance.length > 0 && (
                  <AdvisorPerformanceChart
                    data={stats.mockAdvisorPerformance}
                    height={300}
                    title=""
                    maxBars={8}
                  />
                )}
              </div>
            </div>
          )}

          {/* Mostrar información adicional para asesores y empresas */}
          {(isAdvisorStats(stats) || isCompanyStats(stats)) && (
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h2 className="card-title text-lg font-semibold">Resumen de Solicitudes</h2>
                
                {/* Verificar si existen los datos de la gráfica circular para usarlos */}
                {stats.applicationsByStatusChart && stats.applicationsByStatusChart.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Definir manualmente todos los estados que deben aparecer */}
                      {[
                        { status: 'Nuevo', color: 'amber-400', key: 'pending' },
                        { status: 'En Revisión', color: 'sky-400', key: 'in_review' },
                        { status: 'Aprobado', color: 'green-400', key: 'approved' },
                        { status: 'Por Dispersar', color: 'purple-400', key: 'por_dispersar' },
                        { status: 'Completado', color: 'emerald-700', key: 'completed' },
                        { status: 'Rechazado', color: 'rose-600', key: 'rejected' }
                      ].map((statusItem) => {
                        // Obtener el conteo directamente de applicationsByStatus, que contiene los datos originales
                        // tal como aparecen en el Kanban
                        let count = 0;
                        
                        if (stats.applicationsByStatus && Array.isArray(stats.applicationsByStatus)) {
                          // Buscar datos específicamente con la clave exacta para evitar mezclar categorías
                          switch (statusItem.key) {
                            case 'pending':
                              // Para "Nuevo" buscar 'pending', 'new', 'solicitud'
                              count = stats.applicationsByStatus
                                .filter(item => 
                                  item.status.toLowerCase() === 'pending' || 
                                  item.status.toLowerCase() === 'new' || 
                                  item.status.toLowerCase() === 'solicitud' ||
                                  item.status.toLowerCase() === 'nuevo')
                                .reduce((sum, item) => sum + item.count, 0);
                              break;
                            case 'in_review':
                              // Para "En Revisión"
                              count = stats.applicationsByStatus
                                .filter(item => 
                                  item.status.toLowerCase() === 'in_review' || 
                                  item.status.toLowerCase().includes('revis'))
                                .reduce((sum, item) => sum + item.count, 0);
                              break;
                            case 'approved':
                              // Para "Aprobado" - SOLO incluir estado "approved"
                              count = stats.applicationsByStatus
                                .filter(item => 
                                  item.status.toLowerCase() === 'approved')
                                .reduce((sum, item) => sum + item.count, 0);
                              break;
                            case 'por_dispersar':
                              // Para "Por Dispersar" - SOLO incluir estado "por_dispersar"
                              count = stats.applicationsByStatus
                                .filter(item => 
                                  item.status.toLowerCase() === 'por_dispersar')
                                .reduce((sum, item) => sum + item.count, 0);
                              break;
                            case 'completed':
                              // Para "Completado" - SOLO incluir estado "completed"
                              count = stats.applicationsByStatus
                                .filter(item => 
                                  item.status.toLowerCase() === 'completed')
                                .reduce((sum, item) => sum + item.count, 0);
                              break;
                            case 'rejected':
                              // Para "Rechazado"
                              count = stats.applicationsByStatus
                                .filter(item => 
                                  item.status.toLowerCase() === 'rejected' || 
                                  item.status.toLowerCase().includes('recha'))
                                .reduce((sum, item) => sum + item.count, 0);
                              break;
                          }
                        }
                        
                        // Casos especiales si no se encontró en applicationsByStatus
                        if (count === 0) {
                          // Usar los contadores globales
                          if (statusItem.key === 'pending') {
                            count = stats.pendingApplications || 0;
                          } else if (statusItem.key === 'rejected') {
                            count = stats.rejectedApplications || 0;
                          }
                        }
                        
                        return (
                          <div className="stat px-4 py-2" key={statusItem.status}>
                            <div className="stat-title">{statusItem.status}</div>
                            {statusItem.key === 'pending' && <div className="stat-value text-amber-400">{count}</div>}
                            {statusItem.key === 'in_review' && <div className="stat-value text-sky-400">{count}</div>}
                            {statusItem.key === 'approved' && <div className="stat-value text-green-400">{count}</div>}
                            {statusItem.key === 'por_dispersar' && <div className="stat-value text-purple-400">{count}</div>}
                            {statusItem.key === 'completed' && <div className="stat-value text-emerald-700">{count}</div>}
                            {statusItem.key === 'rejected' && <div className="stat-value text-rose-600">{count}</div>}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Información del tiempo de aprobación solo para empresa */}
                    {isCompanyStats(stats) && (
                      <div className="stat mt-2 border-t pt-4">
                        <div className="stat-title">Promedio de Tiempo de Aprobación</div>
                        <div className="stat-value text-info">{stats.avgApprovalTime.toFixed(1)} días</div>
                        <div className="stat-desc">Tiempo promedio desde solicitud hasta aprobación</div>
                      </div>
                    )}
                  </>
                ) : (
                <div className="stats stats-vertical shadow">
                  <div className="stat">
                      <div className="stat-title">Nuevo</div>
                      <div className="stat-value text-amber-400">{stats.pendingApplications}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-title">Aprobado</div>
                      <div className="stat-value text-green-400">
                        {Array.isArray(stats.applicationsByStatus) ?
                          stats.applicationsByStatus
                            .filter(item => item.status.toLowerCase() === 'approved')
                            .reduce((sum, item) => sum + item.count, 0) : 0}
                      </div>
                  </div>
                  <div className="stat">
                      <div className="stat-title">Rechazado</div>
                      <div className="stat-value text-rose-600">{stats.rejectedApplications}</div>
                    </div>
                    {/* Añadir contadores para "Por Dispersar" y "Completado" */}
                    <div className="stat">
                      <div className="stat-title">Por Dispersar</div>
                      <div className="stat-value text-purple-400">
                        {Array.isArray(stats.applicationsByStatus) ?
                          stats.applicationsByStatus
                            .filter(item => item.status.toLowerCase() === 'por_dispersar')
                            .reduce((sum, item) => sum + item.count, 0) : 0}
                      </div>
                  </div>
                  <div className="stat">
                      <div className="stat-title">Completado</div>
                      <div className="stat-value text-emerald-700">
                        {Array.isArray(stats.applicationsByStatus) ?
                          stats.applicationsByStatus
                            .filter(item => item.status.toLowerCase() === 'completed')
                            .reduce((sum, item) => sum + item.count, 0) : 0}
                      </div>
                    </div>
                    {isCompanyStats(stats) && (
                      <div className="stat">
                        <div className="stat-title">Promedio de Tiempo de Aprobación</div>
                        <div className="stat-value text-info">{stats.avgApprovalTime.toFixed(1)} días</div>
                        <div className="stat-desc">Tiempo promedio desde solicitud hasta aprobación</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabla de solicitudes recientes */}
        <div className="card bg-base-100 shadow-md mt-6">
          <div className="card-body">
            <h2 className="card-title text-lg font-semibold">Solicitudes Recientes</h2>
            
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Empresa</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Fecha y Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentApplications && stats.recentApplications.length > 0 ? (
                    stats.recentApplications.map((app: any, index: number) => (
                      <tr key={index} 
                          className="hover cursor-pointer"
                          onClick={() => navigate(`/applications/${app.id}`)}>
                        <td>{String(app.client_name || 'N/A')}</td>
                        <td>{String(app.company_name || 'N/A')}</td>
                        <td>
                          {app.application_type === 'selected_plans' && app.product_type
                            ? getApplicationTypeLabel(app.product_type)
                            : getApplicationTypeLabel(app.application_type)}
                        </td>
                        <td>{formatCurrency(Number(app.amount || 0))}</td>
                        <td>
                          <span className={`badge badge-${String(app.status) === 'approved' ? 'success' : 
                                                           String(app.status) === 'rejected' ? 'error' : 
                                                           String(app.status) === 'pending' ? 'warning' : 
                                                           String(app.status) === 'in_review' ? 'info' : 'ghost'}`}>
                            {String(app.status || 'N/A')}
                          </span>
                        </td>
                        <td>{app.created_at ? formatDate(String(app.created_at), 'datetime') : 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center">No hay solicitudes recientes</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mostrar información sobre el rango de fechas seleccionado */}
        {filters.startDate && filters.endDate && (
          <div className="alert alert-info mt-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Mostrando datos desde {filters.startDate} hasta {filters.endDate}</span>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard; 