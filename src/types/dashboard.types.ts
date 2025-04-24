import { Database } from './database.types';

type Tables = Database['public']['Tables'];
type Application = Tables['applications']['Row'];
type Advisor = Tables['advisors']['Row'];

export interface AdvisorPerformance {
  advisorId: string;
  applications: number;
  approvalRate: number;
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

export interface QueryFilters {
  startDate?: string;
  endDate?: string;
  advisorId?: string;
  companyId?: string;
  status?: string;
}

export interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalAmount: number;
  averageAmount: number;
  recentApplications: Application[];
  applicationsByMonth: Array<{ month: string; count: number }>;
  applicationsByStatus: Record<string, number>;
  advisorPerformance: Array<AdvisorPerformance>;
}

export interface ApplicationStats extends Omit<DashboardStats, 'applicationsByMonth' | 'applicationsByStatus'> {
  advisorId: string;
  advisorName: string;
  applicationsByMonth: Array<{month: string, count: number}>;
  applicationsByStatus: Record<string, number>;
  applicationsByStatusChart?: Array<{status: string, count: number}>;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  pendingApproval: number;
  totalClients: number;
  totalCompanies: number;
  conversionRate: number;
  avgTimeToApproval: number;
  recent?: any[];
}

export interface CompanyStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalAmount: number;
  avgAmount: number;
  recentApplications: Application[];
  applicationsByMonth: Array<{ month: string; count: number }>;
  applicationsByStatus: Array<{ status: string; count: number }>;
  advisorPerformance: AdvisorPerformanceStats[];
  totalClients: number;
  totalAdvisors: number;
  avgApprovalTime: number;
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