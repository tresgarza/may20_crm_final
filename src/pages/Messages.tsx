import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';

const Messages: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(userId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <MainLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Mensajes</h1>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <p className="text-lg text-center py-10">
              El sistema de mensajería está en mantenimiento. Estará disponible próximamente.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages; 