import React from 'react';
import { Link } from 'react-router-dom';
import { Application } from '../utils/types';
// import { formatCurrency, formatDate } from '../utils/formatters';
// import ApplicationStatusBadge from '../components/ui/ApplicationStatusBadge';
import { APPLICATION_TYPE_LABELS } from '../utils/constants/applications';

// Simple formatters to avoid import issues
const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX');
  } catch (error) {
    return dateString;
  }
};

// Simple status badge component to avoid import issues
const SimpleApplicationStatusBadge = ({ status }: { status: string }) => {
  // Map status to appropriate color
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'badge-warning';
      case 'review': return 'badge-info';
      case 'approved': return 'badge-success';
      case 'rejected': return 'badge-error';
      case 'completed': return 'badge-primary';
      case 'cancelled': return 'badge-ghost';
      default: return 'badge-neutral';
    }
  };

  return (
    <span className={`badge ${getStatusClass(status)}`}>
      {status}
    </span>
  );
};

// Use this instead of the imported ApplicationStatusBadge
const ApplicationStatusBadge = SimpleApplicationStatusBadge;

interface RecentApplicationsProps {
  applications: Application[];
}

const getApplicationTypeLabel = (type: string | undefined): string => {
  if (!type) return 'N/A';
  
  // Check if it's a recognized application type with a label
  const label = APPLICATION_TYPE_LABELS[type];
  if (label) return label;
  
  // If not in our predefined constants, format it nicely
  // Convert snake_case to Title Case (e.g., cash_requests -> Cash Requests)
  if (type === 'selected_plans') return 'Planes Seleccionados';
  if (type === 'product_simulations') return 'Simulación de Producto';
  if (type === 'cash_requests') return 'Solicitud de Efectivo';
  
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const RecentApplications: React.FC<RecentApplicationsProps> = ({ applications }) => {
  if (!applications || applications.length === 0) {
    return <div className="text-center p-4">No hay solicitudes recientes</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Solicitante
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contacto
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Monto
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acción
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((application) => (
            <tr key={application.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(application.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{application.client_name || 'N/A'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{application.client_phone || 'N/A'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {getApplicationTypeLabel(application.application_type)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <ApplicationStatusBadge status={application.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatCurrency(application.amount)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <Link to={`/applications/${application.id}`} className="text-indigo-600 hover:text-indigo-900">
                  Ver Detalle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RecentApplications; 