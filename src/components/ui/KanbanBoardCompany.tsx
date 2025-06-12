import React from 'react';
import { Application } from '../../services/applicationService';
import KanbanBoard from './KanbanBoard';
import { APPLICATION_STATUS } from '../../utils/constants/statuses';

interface KanbanBoardCompanyProps {
  applications: Application[];
  onRefresh: () => Promise<void>;
}

const KanbanBoardCompany: React.FC<KanbanBoardCompanyProps> = ({ applications, onRefresh }) => {
  // Los administradores de empresa ven un tablero Kanban filtrado según su rol
  return (
    <KanbanBoard 
      applications={applications}
      statusField="status"
      onStatusChange={async (app, newStatus) => {
        // Aquí se podría implementar lógica específica para admins de empresa
        await onRefresh();
      }}
    />
  );
};

export default KanbanBoardCompany; 