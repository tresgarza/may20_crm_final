import { parseNumericString } from './numberFormatting';

/**
 * Procesa un campo numérico convirtiéndolo de string a valor numérico
 * @param data Objeto que contiene los datos
 * @param field Nombre del campo a procesar
 * @returns Objeto con el campo procesado
 */
export const processNumericField = (data: Record<string, any>, field: string): Record<string, any> => {
  if (!data || !data[field]) return data;
  
  const updatedData = { ...data };
  const parsedValue = parseNumericString(data[field]);
  
  if (parsedValue !== undefined) {
    updatedData[field] = parsedValue;
  }
  
  return updatedData;
};

/**
 * Procesa múltiples campos numéricos en un objeto
 * @param data Objeto que contiene los datos
 * @param fields Array de nombres de campos a procesar
 * @returns Objeto con los campos procesados
 */
export const processNumericFields = (data: Record<string, any>, fields: string[]): Record<string, any> => {
  if (!data || !fields.length) return data;
  
  let updatedData = { ...data };
  
  for (const field of fields) {
    updatedData = processNumericField(updatedData, field);
  }
  
  return updatedData;
}; 
 