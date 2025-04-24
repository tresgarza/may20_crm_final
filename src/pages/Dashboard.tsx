import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartBarIcon, CurrencyDollarIcon, UserGroupIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
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
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    advisorId: '',
    companyId: '',
  });
  const [pendingApproval, setPendingApproval] = useState(0);

  // Create a wrapper for formatCurrency that matches MetricCard's formatValue type
  const formatMetricValue = (value: string | number): string => {
    if (typeof value === 'string') {
      return formatCurrency(parseFloat(value) || 0);
    }
    return formatCurrency(value || 0);
  };

  // Comprobar si el objeto es de tipo ApplicationStats
  const isAdvisorStats = (obj: any): obj is ApplicationStats => {
    console.log('Checking if stats is AdvisorStats:', JSON.stringify(obj));
    return obj && 'advisorId' in obj && 'conversionRate' in obj;
  };

  // Comprobar si el objeto es de tipo CompanyStats
  const isCompanyStats = (obj: any): obj is CompanyStats => {
    console.log('Checking if stats is CompanyStats:', JSON.stringify(obj));
    return obj && 'totalAdvisors' in obj && 'avgApprovalTime' in obj;
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
      averageAmount: 0,
      recentApplications: [],
      applicationsByStatus: {},
      applicationsByMonth: [],
      advisorPerformance: []
    };
  };

  // Crear datos de respaldo para estadísticas de asesor
  const createFallbackAdvisorStats = (advisorId: string): ApplicationStats => {
    return {
      totalApplications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
      totalAmount: 0,
      averageAmount: 0,
      recentApplications: [],
      advisorId: advisorId,
      advisorName: user?.name || 'Asesor',
      applicationsByMonth: [],
      applicationsByStatus: {},
      totalApproved: 0,
      totalRejected: 0,
      totalPending: 0,
      pendingApproval: 0,
      totalClients: 0,
      totalCompanies: 0,
      conversionRate: 0,
      avgTimeToApproval: 0,
      advisorPerformance: []
    };
  };

  // Crear datos de respaldo para estadísticas de empresa
  const createFallbackCompanyStats = (companyId: string): CompanyStats => {
    return {
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
      applicationsByMonth: [],
      advisorPerformance: []
    };
  };

  // Función para cargar estadísticas basadas en el rol
  const loadStats = async () => {
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
      
      console.log('Using query filters:', queryFilters);

      if (user.role === USER_ROLES.SUPERADMIN) {
        console.log('Loading stats for SUPERADMIN');
        dashboardStats = await getGeneralDashboardStats(queryFilters);
      } else if (user.role === USER_ROLES.ADVISOR) {
        console.log('Loading stats for ADVISOR with ID:', user.id);
        dashboardStats = await getAdvisorStats(user.id, queryFilters);
        console.log('ADVISOR stats loaded:', {
          totalApplications: dashboardStats?.totalApplications,
          approvedApplications: dashboardStats?.approvedApplications,
          applicationsByStatus: dashboardStats?.applicationsByStatus
        });
      } else if (user.role === USER_ROLES.COMPANY_ADMIN) {
        console.log('Loading stats for COMPANY_ADMIN with entity ID:', user.entityId);
        
        if (user.entityId) {
          // Si el usuario es administrador de empresa, cargar estadísticas de la empresa
          dashboardStats = await getCompanyDashboardStats(user.entityId, queryFilters);
        } else {
          console.error('Company admin user has no entityId (company_id)');
        }
      }

      console.log('Received dashboard stats:', dashboardStats);
      
      if (dashboardStats && 'applicationsByStatus' in dashboardStats) {
        console.log('Applications by status:', dashboardStats.applicationsByStatus);
      }
      
      if (dashboardStats && 'applicationsByMonth' in dashboardStats) {
        console.log('Applications by month:', dashboardStats.applicationsByMonth);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user, filters]);

  // Manejadores para los filtros
  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  // Utility function to get application type label
  const getApplicationTypeLabel = (type: string): string => {
    return APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS] || type;
  };

  // Check if stats has the amountRanges and mockAdvisorPerformance properties
  const hasExtendedData = (stats: any): stats is DashboardStatsType & { amountRanges: AmountRange[], mockAdvisorPerformance: AdvisorData[] } => {
    return 'amountRanges' in stats && 'mockAdvisorPerformance' in stats;
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Solicitudes"
            value={stats.totalApplications}
            icon={<ChartBarIcon className="h-5 w-5" />}
            color="blue"
          />
          <MetricCard
            title="Solicitudes Aprobadas"
            value={isAdvisorStats(stats) ? stats.approvedApplications : stats.approvedApplications}
            previousValue={0}
            icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />}
            color="green"
          />
          <MetricCard
            title="Monto Promedio"
            value={isCompanyStats(stats) ? stats.avgAmount : stats.averageAmount}
            formatValue={formatMetricValue}
            icon={<CurrencyDollarIcon className="h-5 w-5" />}
            color="indigo"
          />
          {isAdvisorStats(stats) ? (
            <MetricCard
              title="Tasa de Conversión"
              value={stats.conversionRate}
              isPercentage={true}
              icon={<UserGroupIcon className="h-5 w-5" />}
              color="purple"
            />
          ) : (
            <MetricCard
              title="Total de Clientes"
              value={'totalClients' in stats && stats.totalClients !== undefined ? Number(stats.totalClients) : 0}
              icon={<UserGroupIcon className="h-5 w-5" />}
              color="purple"
            />
          )}
        </div>

        {/* Gráficos principales - Always show regardless of data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-lg font-semibold">Solicitudes por Mes</h2>
              {stats.applicationsByMonth && (
                <MonthlyApplicationsChart
                  data={Array.isArray(stats.applicationsByMonth) ? stats.applicationsByMonth.map((item: any) => ({
                    month: String(item.month || ''),
                    count: Number(item.count || 0)
                  })) : []}
                  height={300}
                  title=""
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
              />
            </div>
          </div>
        </div>

        {/* Gráficos secundarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-lg font-semibold">Distribución por Monto</h2>
              {hasExtendedData(stats) && stats.amountRanges && stats.amountRanges.length > 0 && (
                <AmountRangeChart
                  data={stats.amountRanges}
                  height={300}
                  title=""
                />
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

          {/* Mostrar información adicional para asesores */}
          {isAdvisorStats(stats) && (
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h2 className="card-title text-lg font-semibold">Resumen de Solicitudes</h2>
                <div className="stats stats-vertical shadow">
                  <div className="stat">
                    <div className="stat-title">Solicitudes Aprobadas</div>
                    <div className="stat-value text-success">{stats.approvedApplications}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Solicitudes Rechazadas</div>
                    <div className="stat-value text-error">{stats.rejectedApplications}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Solicitudes Pendientes</div>
                    <div className="stat-value text-warning">{stats.pendingApplications}</div>
                  </div>
                </div>
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
      </div>
    </MainLayout>
  );
};

export default Dashboard; 