/**
 * Formatea un valor numérico a formato de moneda
 * @param amount Monto a formatear
 * @param options Opciones de formato
 * @returns String formateado como moneda
 */
export const formatCurrency = (
  amount: number | undefined | null,
  options: {
    currency?: string;
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  } = {}
): string => {
  if (amount === undefined || amount === null) return "$0.00";
  
  const {
    currency = 'MXN',
    maximumFractionDigits = 2,
    minimumFractionDigits = 2,
  } = options;
  
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits,
    minimumFractionDigits
  }).format(amount);
};

/**
 * Formatea una fecha a formato legible
 * @param dateString String de fecha para formatear
 * @param format Formato deseado
 * @returns String de fecha formateada
 */
export const formatDate = (
  dateString: string | undefined | null,
  format: 'short' | 'long' | 'relative' = 'short'
): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Verificar que la fecha es válida
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    if (format === 'short') {
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    }
    
    if (format === 'long') {
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    if (format === 'relative') {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSecs < 60) return 'Hace unos segundos';
      if (diffMins < 60) return `Hace ${diffMins} min${diffMins > 1 ? 's' : ''}`;
      if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
      
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    
    return dateString;
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return dateString;
  }
}; 