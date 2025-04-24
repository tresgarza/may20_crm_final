import * as React from 'react';
import { Link } from 'react-router-dom';
import { Application } from '../utils/types';
import { formatCurrency, formatDate } from '../utils/formatters';
// import ApplicationStatusBadge from '../components/ui/ApplicationStatusBadge';
import { APPLICATION_TYPE_LABELS } from '../utils/constants/applications';

// Simple formatters to avoid import issues
// Eliminar formatCurrency y formatDate de este archivo ya que importamos de la utilidad

// Simple status badge component to avoid import issues
const SimpleApplicationStatusBadge = ({ status }: { status: string }) => {
  // Map status to appropriate color
  const getStatusClass = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'approved':
      case 'aprobado':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'rechazado':
        return 'bg-red-100 text-red-800';
      case 'in_review':
      case 'en revisión':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(status)}`}>
      {status}
    </span>
  );
};

// Function to get application type label
const getApplicationTypeLabel = (type: string | undefined): string => {
  if (!type) return 'N/A';
  return APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS] || type;
};

interface RecentApplicationsProps {
  applications: Application[];
}

// Rename component to avoid conflicts
const ApplicationStatusBadge = SimpleApplicationStatusBadge;

const RecentApplications: React.FC<RecentApplicationsProps> = ({ applications }) => {
  if (!applications || applications.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
        <p className="text-gray-500">No hay solicitudes recientes para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha y Hora
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cliente
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Teléfono
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
                {formatDate(application.created_at, 'datetime')}
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