/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Format options for different date display styles
 */
export type DateFormatOptions = {
  includeTime?: boolean;
  monthFormat?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  dayFormat?: 'numeric' | '2-digit';
  yearFormat?: 'numeric' | '2-digit';
  hourFormat?: 'numeric' | '2-digit';
  minuteFormat?: 'numeric' | '2-digit';
  secondFormat?: 'numeric' | '2-digit';
  locale?: string;
};

/**
 * Default date format options
 */
const defaultFormatOptions: DateFormatOptions = {
  includeTime: false,
  monthFormat: 'long',
  dayFormat: 'numeric',
  yearFormat: 'numeric',
  hourFormat: '2-digit',
  minuteFormat: '2-digit',
  locale: 'es-MX'
};

/**
 * Format a date string or Date object to a localized string
 * @param date - The date to format
 * @param options - Formatting options
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn(`Invalid date: ${date}`);
      return '';
    }
    
    const opts = { ...defaultFormatOptions, ...options };
    
    const formatOptions: Intl.DateTimeFormatOptions = {
      day: opts.dayFormat,
      month: opts.monthFormat,
      year: opts.yearFormat,
    };
    
    if (opts.includeTime) {
      formatOptions.hour = opts.hourFormat;
      formatOptions.minute = opts.minuteFormat;
      if (opts.secondFormat) {
        formatOptions.second = opts.secondFormat;
      }
    }
    
    return dateObj.toLocaleDateString(opts.locale, formatOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format a date as a short date (MM/DD/YYYY)
 * @param date - The date to format
 * @param locale - The locale to use (defaults to es-MX)
 * @returns Formatted date string
 */
export const formatShortDate = (
  date: string | Date | null | undefined,
  locale = 'es-MX'
): string => {
  return formatDate(date, {
    monthFormat: '2-digit',
    dayFormat: '2-digit',
    yearFormat: 'numeric',
    locale
  });
};

/**
 * Format a date with time (MM/DD/YYYY, HH:MM)
 * @param date - The date to format
 * @param locale - The locale to use (defaults to es-MX)
 * @returns Formatted date string with time
 */
export const formatDateTime = (
  date: string | Date | null | undefined,
  locale = 'es-MX'
): string => {
  return formatDate(date, {
    includeTime: true,
    monthFormat: '2-digit',
    dayFormat: '2-digit',
    yearFormat: 'numeric',
    hourFormat: '2-digit',
    minuteFormat: '2-digit',
    locale
  });
};

/**
 * Format a date as a long date (Month Day, Year)
 * @param date - The date to format
 * @param locale - The locale to use (defaults to es-MX)
 * @returns Formatted long date string
 */
export const formatLongDate = (
  date: string | Date | null | undefined,
  locale = 'es-MX'
): string => {
  return formatDate(date, {
    monthFormat: 'long',
    dayFormat: 'numeric',
    yearFormat: 'numeric',
    locale
  });
};

/**
 * Get the difference between two dates in days
 * @param startDate - The start date
 * @param endDate - The end date (defaults to current date)
 * @returns Number of days between dates
 */
export const getDaysDifference = (
  startDate: string | Date,
  endDate: string | Date = new Date()
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Convert to UTC to avoid timezone issues
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  
  // Calculate difference in days
  const millisPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((utcEnd - utcStart) / millisPerDay);
};

/**
 * Format a date as relative time (e.g., "2 days ago", "in 3 months")
 * @param date - The date to format
 * @param baseDate - The reference date (defaults to current date)
 * @param locale - The locale to use
 * @returns Relative time string
 */
export const formatRelativeTime = (
  date: string | Date,
  baseDate: string | Date = new Date(),
  locale = 'es-MX'
): string => {
  const target = new Date(date);
  const base = new Date(baseDate);
  
  // Define time units in milliseconds
  const second = 1000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  const diff = target.getTime() - base.getTime();
  const absDiff = Math.abs(diff);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  // Choose appropriate unit
  if (absDiff < minute) {
    return rtf.format(Math.round(diff / second), 'second');
  } else if (absDiff < hour) {
    return rtf.format(Math.round(diff / minute), 'minute');
  } else if (absDiff < day) {
    return rtf.format(Math.round(diff / hour), 'hour');
  } else if (absDiff < week) {
    return rtf.format(Math.round(diff / day), 'day');
  } else if (absDiff < month) {
    return rtf.format(Math.round(diff / week), 'week');
  } else if (absDiff < year) {
    return rtf.format(Math.round(diff / month), 'month');
  } else {
    return rtf.format(Math.round(diff / year), 'year');
  }
};

/**
 * Convert a string date to ISO format (YYYY-MM-DD)
 * @param dateStr - The date string to convert
 * @returns ISO formatted date string
 */
export const toISODateString = (dateStr: string | Date): string => {
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error converting date to ISO format:', error);
    return '';
  }
};

/**
 * Add days to a date
 * @param date - The base date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export const addDays = (date: Date | string, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Add months to a date
 * @param date - The base date
 * @param months - Number of months to add (can be negative)
 * @returns New date with months added
 */
export const addMonths = (date: Date | string, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * Add years to a date
 * @param date - The base date
 * @param years - Number of years to add (can be negative)
 * @returns New date with years added
 */
export const addYears = (date: Date | string, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

/**
 * Check if a date is in the past
 * @param date - The date to check
 * @returns True if date is in the past
 */
export const isPastDate = (date: Date | string): boolean => {
  const checkDate = new Date(date);
  const today = new Date();
  
  // Reset time part for date comparison
  today.setHours(0, 0, 0, 0);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate < today;
};

/**
 * Check if a date is in the future
 * @param date - The date to check
 * @returns True if date is in the future
 */
export const isFutureDate = (date: Date | string): boolean => {
  const checkDate = new Date(date);
  const today = new Date();
  
  // Reset time part for date comparison
  today.setHours(0, 0, 0, 0);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate > today;
};

/**
 * Check if a date is today
 * @param date - The date to check
 * @returns True if date is today
 */
export const isToday = (date: Date | string): boolean => {
  const checkDate = new Date(date);
  const today = new Date();
  
  return (
    checkDate.getDate() === today.getDate() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getFullYear() === today.getFullYear()
  );
};

/**
 * Get the start of a day (00:00:00)
 * @param date - The date to get start of day for
 * @returns Date set to start of day
 */
export const startOfDay = (date: Date | string): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get the end of a day (23:59:59.999)
 * @param date - The date to get end of day for
 * @returns Date set to end of day
 */
export const endOfDay = (date: Date | string): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Get the start of a month (1st day, 00:00:00)
 * @param date - The date to get start of month for
 * @returns Date set to start of month
 */
export const startOfMonth = (date: Date | string): Date => {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get the end of a month (last day, 23:59:59.999)
 * @param date - The date to get end of month for
 * @returns Date set to end of month
 */
export const endOfMonth = (date: Date | string): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  result.setHours(23, 59, 59, 999);
  return result;
}; 