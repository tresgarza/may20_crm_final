/**
 * Date utility functions for formatting, parsing, and working with dates
 */

/**
 * Formats a date string into a localized date string
 * @param dateString - The date string to format
 * @param includeTime - Whether to include the time in the formatted string
 * @returns Formatted date string or empty string if input is invalid
 */
export function formatDate(dateString: string | null | undefined, includeTime = false): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('es-PR', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Parses a date string into a Date object
 * @param dateString - The date string to parse
 * @returns Date object or null if parsing fails
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Checks if a date is within a given range
 * @param date - The date to check
 * @param startDate - The start of the range
 * @param endDate - The end of the range
 * @returns True if the date is within the range, false otherwise
 */
export function isDateInRange(
  date: Date | string | null | undefined, 
  startDate: Date | string | null | undefined, 
  endDate: Date | string | null | undefined
): boolean {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!dateObj || isNaN(dateObj.getTime())) return false;
  
  const start = startDate ? (typeof startDate === 'string' ? new Date(startDate) : startDate) : null;
  const end = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : null;
  
  if (start && end) {
    return dateObj >= start && dateObj <= end;
  } else if (start) {
    return dateObj >= start;
  } else if (end) {
    return dateObj <= end;
  }
  
  return true;
} 