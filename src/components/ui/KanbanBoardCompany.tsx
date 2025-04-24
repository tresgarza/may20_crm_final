import React from 'react';
import KanbanBoard from './KanbanBoard';
import { updateApplicationStatusField, ApplicationStatus } from '../../services/applicationService';
import { useAuth } from '../../contexts/AuthContext';
import { APPLICATION_STATUS } from '../../utils/constants/statuses';

interface KanbanBoardCompanyProps {
  applications: any[];
  onRefresh?: () => void;
}

const KanbanBoardCompany: React.FC<KanbanBoardCompanyProps> = ({ applications, onRefresh }) => {
  const { user } = useAuth();

  const handleStatusChange = async (application: any, newStatus: string, statusField?: string) => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    try {
      // Call the service to update company_status
      await updateApplicationStatusField(
        application.id,
        newStatus as ApplicationStatus,
        'company_status',
        `Estado cambiado a ${newStatus} por administrador de empresa`,
        user.id
      );

      // Refresh the board if callback provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating company status:', error);
      throw error;
    }
  };

  return (
    <KanbanBoard 
      applications={applications} 
      onStatusChange={handleStatusChange}
      statusField="company_status"
    />
  );
};

export default KanbanBoardCompany; 