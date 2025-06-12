import React from 'react';
import { Application } from '../../services/applicationService';
import KanbanBoard from './KanbanBoard';
import { APPLICATION_STATUS } from '../../utils/constants/statuses';

interface KanbanBoardAdvisorProps {
  applications: Application[];
  onRefresh: () => Promise<void>;
}

const KanbanBoardAdvisor: React.FC<KanbanBoardAdvisorProps> = ({ applications, onRefresh }) => {
  // Los asesores ven un tablero Kanban filtrado según su rol
  return (
    <KanbanBoard 
      applications={applications}
      statusField="status"
      onStatusChange={async (app, newStatus) => {
        // Aquí se podría implementar lógica específica para asesores
        await onRefresh();
      }}
    />
  );
};

export default KanbanBoardAdvisor; 