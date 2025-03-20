/**
 * Ejecuta una consulta SQL directa
 * @param query Consulta SQL a ejecutar
 * @returns Resultado de la consulta
 */
export const executeQuery = async (query: string): Promise<any[]> => {
  try {
    const url = 'http://localhost:3100/query';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Try to parse error as JSON if possible
      let errorDetail;
      try {
        errorDetail = JSON.parse(errorText);
      } catch {
        errorDetail = errorText;
      }
      
      // Check for relation/table not existing in error message
      const errorDetailStr = JSON.stringify(errorDetail);
      if (errorDetailStr.includes('relation') && errorDetailStr.includes('does not exist')) {
        console.warn('Tabla no encontrada en la base de datos:', errorDetailStr);
        return []; // Retornar array vacío en lugar de lanzar error
      }
      
      throw new Error(`Error al ejecutar la consulta: ${response.statusText}. Detalles: ${errorDetailStr}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    // Check if error is about missing relation/table
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      console.warn('Error ejecutando consulta - tabla no existe:', errorMessage);
      return []; // Retornar array vacío en lugar de lanzar error
    }
    
    console.error('Error ejecutando consulta:', error);
    throw error;
  }
};

/**
 * Escapa caracteres especiales en string para prevenir inyección SQL
 * @param value String a escapar
 * @returns String escapado
 */
export const escapeSqlString = (value: string): string => {
  if (!value) return '';
  
  // Reemplazar comillas simples por dos comillas simples (estándar SQL)
  return value.replace(/'/g, "''");
};

/**
 * Formatea una fecha para SQL
 * @param date Fecha a formatear
 * @returns String formateado para SQL
 */
export const formatDateForSql = (date: Date): string => {
  return date.toISOString();
};

/**
 * Convierte un objeto a una cadena de condiciones SQL WHERE
 * @param conditions Objeto con condiciones {columna: valor}
 * @returns String con condiciones SQL
 */
export const objectToSqlWhere = (conditions: Record<string, any>): string => {
  const clauses = [];
  
  for (const [key, value] of Object.entries(conditions)) {
    if (value === undefined || value === null) continue;
    
    if (typeof value === 'string') {
      clauses.push(`${key} = '${escapeSqlString(value)}'`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clauses.push(`${key} = ${value}`);
    } else if (value instanceof Date) {
      clauses.push(`${key} = '${formatDateForSql(value)}'`);
    } else if (Array.isArray(value)) {
      const formattedValues = value.map(v => 
        typeof v === 'string' ? `'${escapeSqlString(v)}'` : v
      );
      clauses.push(`${key} IN (${formattedValues.join(',')})`);
    }
  }
  
  return clauses.length > 0 ? clauses.join(' AND ') : '1=1';
}; 