/**
 * Utility functions for data conversion and type handling
 */

/**
 * Converts a value to a number (integer or float) if possible
 * @param value The value to convert
 * @param isInteger Whether to convert to integer (true) or float (false)
 * @returns The converted number or undefined if the conversion fails or the input is empty
 */
export const parseNumericField = (value: any, isInteger = false): number | undefined => {
  // Return undefined for empty values
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  
  try {
    if (isInteger) {
      return parseInt(String(value), 10);
    } else {
      return parseFloat(String(value));
    }
  } catch (err) {
    console.error(`Error converting value to number: ${value}`, err);
    return undefined;
  }
};

/**
 * Converts any string values in the specified fields to numbers
 * 
 * @param data Object containing data to process
 * @param floatFields Array of field names to convert to floating point numbers
 * @param intFields Array of field names to convert to integers
 * @returns A new object with the specified fields converted to numbers
 */
export const processNumericFields = <T extends Record<string, any>>(
  data: Partial<T>, 
  floatFields: (keyof T)[] = [], 
  intFields: (keyof T)[] = []
): Partial<T> => {
  // Create a copy of the original data
  const processedData = { ...data } as Partial<T>;
  
  // Process float fields
  floatFields.forEach(field => {
    const value = processedData[field];
    if (value !== undefined && value !== null) {
      // Handle string values that need conversion
      if (typeof value === 'string') {
        // Remove commas, currency symbols, and other non-numeric characters
        const cleanValue = value.replace(/[^\d.-]/g, '');
        if (cleanValue) {
          (processedData as any)[field] = parseFloat(cleanValue);
        } else {
          // If the string is empty or only had non-numeric chars, set to null
          (processedData as any)[field] = null;
        }
      } 
      // Ensure numbers remain numbers (no conversion needed)
      else if (typeof value !== 'number') {
        (processedData as any)[field] = null;
      }
    }
  });
  
  // Process integer fields
  intFields.forEach(field => {
    const value = processedData[field];
    if (value !== undefined && value !== null) {
      // Handle string values that need conversion
      if (typeof value === 'string') {
        // Remove commas and other non-numeric characters
        const cleanValue = value.replace(/[^\d-]/g, '');
        if (cleanValue) {
          (processedData as any)[field] = parseInt(cleanValue, 10);
        } else {
          // If the string is empty or only had non-numeric chars, set to null
          (processedData as any)[field] = null;
        }
      } 
      // Ensure numbers remain numbers (no conversion needed)
      else if (typeof value !== 'number') {
        (processedData as any)[field] = null;
      }
    }
  });
  
  return processedData;
}; 