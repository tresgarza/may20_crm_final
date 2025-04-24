import React from 'react';
import KanbanBoard from './KanbanBoard';
import { updateApplicationStatusField, ApplicationStatus } from '../../services/applicationService';
import { useAuth } from '../../contexts/AuthContext';
import { APPLICATION_STATUS } from '../../utils/constants/statuses';

interface KanbanBoardAdvisorProps {
  applications: any[];
  onRefresh?: () => void;
}

const KanbanBoardAdvisor: React.FC<KanbanBoardAdvisorProps> = ({ applications, onRefresh }) => {
  const { user } = useAuth();

  const handleStatusChange = async (application: any, newStatus: string, statusField?: string) => {
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    try {
      // Call the service to update advisor_status
      await updateApplicationStatusField(
        application.id,
        newStatus as ApplicationStatus,
        'advisor_status',
        `Estado cambiado a ${newStatus} por asesor`,
        user.id
      );

      // Refresh the board if callback provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating advisor status:', error);
      throw error;
    }
  };

  return (
    <KanbanBoard 
      applications={applications} 
      onStatusChange={handleStatusChange}
      statusField="advisor_status"
    />
  );
};

export default KanbanBoardAdvisor; 