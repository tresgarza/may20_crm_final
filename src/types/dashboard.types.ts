import type { Database } from './database.types';

type Tables = Database['public']['Tables'];
type Application = Tables['applications']['Row'];
type Advisor = Tables['advisors']['Row'];

export interface AdvisorPerformance {
  advisorId: string;
  advisorName: string;
  totalApplications: number;
  approvedApplications: number;
  conversionRate: number;
  approvalRate: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface MonthlyApplicationCount {
  month: string;
  count: number;
}

export interface AmountRange {
  range: string;
  count: number;
}

export interface MockAdvisorData {
  advisor_name: string;
  total_applications: number;
  approved_applications?: number;
}

export interface AdvisorPerformanceStats {
  advisorId: string;
  advisorName: string;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  approvalRate: number;
  avgApprovalTime: number;
}

export interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  applicationsByStatus: StatusCount[];
  applicationsByStatusChart: StatusCount[];
  applicationsByMonth: MonthlyApplicationCount[];
  recentApplications: Application[];
  totalClients: number;
  totalCompanies?: number;
  avgAmount: number;
  totalAmount: number;
  conversionRate?: number;
  amountRanges?: AmountRange[];
  mockAdvisorPerformance?: MockAdvisorData[];
  attentionNeededCount?: number;
}

export interface ApplicationStats extends Omit<DashboardStats, 'mockAdvisorPerformance'> {
  applicationId: string;
  advisorId: string;
  applicationsByStatusChart: StatusCount[];
}

export interface AdvisorStats extends Omit<DashboardStats, 'mockAdvisorPerformance'> {
  advisorId: string;
  applicationsByStatusChart: StatusCount[];
}

export interface CompanyStats extends DashboardStats {
  totalAdvisors: number;
  avgApprovalTime: number;
  advisorPerformance: AdvisorPerformanceStats[];
  companyId: string;
}

export interface QueryFilters {
  startDate?: string;
  endDate?: string;
  advisorId?: string;
  companyId?: string;
  status?: string;
}

export interface RecentApplication {
  id: string;
  created_at: string;
  client_name: string;
  status: string;
  amount: number;
  company_name: string;
  application_type: 'product_simulations' | 'selected_plans';
}

export interface RecentCompanyApplication extends Application {
  advisor: {
    id: string;
    user_id: string;
    specialization: string;
  };
}

export interface ApplicationByMonth {
  month: string;
  count: number;
}

export interface QueryResult {
  count?: string;
  sum?: string;
  avg?: string;
} 