import React, { useState } from 'react';

interface KanbanBoardProps {
  applications: any[];
  onStatusChange?: (application: any, newStatus: string) => Promise<void>;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ applications, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  return (
    <div className="kanban-board">
      <div className="applications-container">
        <p>Kanban board is being rebuilt...</p>
        <p>Applications count: {applications.length}</p>
      </div>
    </div>
  );
};

export default KanbanBoard; 